
let config = require('../lib/config.js');
let server = require('../lib/server.js');
let eth = require('../lib/eth.js');

const Promise = require('bluebird');
const account = require('../test/mocks/wallet.js');
const wallet = require('eth-lightwallet');
const pouchdb = require('pouchdb');

const chai = require('chai');
const spies = require('chai-spies');
const chaiAsPromised = require("chai-as-promised");
const expect = chai.expect;

chai.use(spies);
chai.use(chaiAsPromised);

describe('Bluetooth Server', () => {
    
    var keystore, address;

    // Prep a single keystore/account for all tests
    before(() => {
        let json = JSON.stringify(account.keystore);
        keystore = wallet.keystore.deserialize(json);  
        keystore.generateNewAddress(account.key, 1);
        address = keystore.getAddresses()[0];
    });

    describe('Utilites', () => {

        var animist;

        beforeEach( () => { 
            animist = new server.AnimistServer();
        });

        describe('queueTx(tx)', ()=>{
            var tx, queue, old_config;
            
            it('should transform input into buffers of MAX_SIZE & queue them',()=>{
                
                // Testing 11 chars (including "" from JSON stringify) /4 byte packets: 
                tx = "123412341";
                old_config = config.MAX_SEND;
                config.MAX_SEND = 4;
                
                animist.queueTx(tx);
                queue = animist.getSendQueue();
                
                expect(queue.length).to.equal(3);
                expect(Buffer.isBuffer(queue[0])).to.be.true;
                expect(queue[2].length).to.equal(3);

                // Testing 3 chars (including "" from JSON stringify) /4 byte packets:
                tx = '1';
                animist.resetSendQueue();
                animist.queueTx(tx);
                queue = animist.getSendQueue();

                expect(queue.length).to.equal(1);
                expect(queue[0].length).to.equal(3);

                // Cleanup 
                config.MAX_SEND = old_config;

            });
        });

        describe('resetPin', ()=>{
            var new_pin, old_pin;

            it('should generate & set a new 32 character pin', ()=>{
        
                old_pin = animist.getPin();

                animist.resetPin();
                new_pin = animist.getPin();

                expect( typeof old_pin).to.equal('string');
                expect( old_pin.length).to.equal(32);
                expect( typeof new_pin).to.equal('string');
                expect( new_pin.length).to.equal(32);
                expect(new_pin).not.to.equal(old_pin);
            });

        });

        describe('parseHasTxRequest(req)', () =>{

            var req, output, msg;

            it('should return a correctly formatted object representing a signed msg', () =>{

                msg = 'a message';
                req = wallet.signing.signMsg( keystore, account.key, msg, address); 
                req = JSON.stringify(req);
                
                output = animist.parseHasTxRequest(req);

                expect( output.status).to.equal(1);
                expect( typeof output.val).to.equal('object');
                expect( Buffer.isBuffer(output.val.r)).to.be.true;
                expect( Buffer.isBuffer(output.val.s)).to.be.true;

            });

            it('should return error if req is not parse-able as a signed msg', ()=>{
                req = '{\"signed\": \"I am not signed\"}';
                output = animist.parseHasTxRequest(req);

                expect(output.status).to.equal(0);
                expect(output.val).to.equal(config.codes.NO_SIGNED_MSG_IN_REQUEST);
            });

            it('should return error if req is not JSON formatted', ()=>{

                req = "0x5[w,r,0,,n,g";
                output = animist.parseHasTxRequest(req);

                expect(output.status).to.equal(0);
                expect(output.val).to.equal(config.codes.INVALID_JSON_IN_REQUEST);

            });

        });

        
        describe('isValidSession(id)', function(){

            let db;
            
            // DB creation and cleanup
            beforeEach(() => { 
                db = new pouchdb('sessions'); 
                animist.setDB(db);
            });

            afterEach((done)=>{ 
                db.destroy().then(()=>{
                    done();
                }) 
            });

            it('should resolve if session id exists in the db', function(done){
                let doc = {_id: '55555', val: '12345' };
                let promise;

                db.put(doc).then(()=>{
                    expect(animist.isValidSession('55555')).to.eventually.include.keys('_id').notify(done);        
                }).catch((err) => {
                    expect('Test should not error').to.equal('true');
                });

            });

            it('should reject if the record is not found in the DB', function(done){
                let doc = {_id: '55555', val: '12345' };
                let promise;

                db.put(doc).then(()=>{
                    expect(animist.isValidSession('77777')).to.be.rejected.notify(done);        
                }).catch((err) => {
                    expect('Test should not error').to.equal('true');
                });
            });

            it('should reject if the id param is not a string', function(done){
                expect(animist.isValidSession({obj: 5})).to.be.rejected.notify(done);
            });

            
        });

        describe('startSession(tx)', function(){

           let db, orig_session;
            
            // DB creation and cleanup
            beforeEach(()=>{ 
                db = new pouchdb('sessions'); 
                animist.setDB(db);
            });

            afterEach((done)=>{ 
                db.destroy().then(()=>{
                    done()
                }) 
            });
            
            it('should bind a session id and expiration time to the param object', (done) => {

                let fakeTx = config.fakeTx;

                animist.startSession(fakeTx).then(()=>{
                    expect(fakeTx.sessionId).to.be.a.string;
                    expect(fakeTx.expires).to.be.gt(Date.now());
                    done();
                });
            });

            it('should save session data to the DB', function(done){

                let fakeTx = config.fakeTx;

                animist.startSession(fakeTx).then(()=>{
                    let expected = {_id: fakeTx.sessionId, expires: fakeTx.expires }
                    expect(db.get(fakeTx.sessionId)).to.eventually.include(expected).notify(done);
                });

            });

            it('should delete the session data after a specified time', function(done){
                let fakeTx = config.fakeTx;
                let original = config.SESSION_LENGTH;

                animist.setSessionLength(10);

                animist.startSession(fakeTx).then((doc)=>{
                    
                    setTimeout(()=>{
                        
                        expect(db.get(fakeTx.sessionId)).to.eventually.be.rejected.notify(done);
                        animist.setSessionLength(original);
                        
                    }, 15);
                });
            });


        });

    });

    describe('Request Handlers', () => {

        var animist, db; 
 
        // New server per test
        beforeEach(() => { 
            animist = new server.AnimistServer();
            db = new pouchdb('sessions'); 
            animist.setDB(db);
        });

        afterEach((done)=>{ 
            db.destroy().then(()=>{
                done()
            }) 
        });

        describe('onPinRead', () => {


          it('should respond to request w/ the current pin', () => {
            
            let fns = {};
            let codes = config.codes;
            let pin_to_buffer = new Buffer(animist.getPin());
            fns.callback = (code, pin) => {};
            
            chai.spy.on(fns, 'callback');
            animist.onPinRead(null, fns.callback);

            expect(fns.callback).to.have.been.called.with(codes.RESULT_SUCCESS, pin_to_buffer);

          });
        });

        describe('onHasTxWrite', () => {
            
            let req, eth_db, mock_contract, fns = {};
    
            // Mocks
            before(()=>{
                
                // Mock request
                req = wallet.signing.signMsg( keystore, account.key, animist.getPin(), address); 
                req = JSON.stringify(req);

                mock_contract = { _id: address, authority: address, contract: config.fakeTx.code };
                
            });

            // Clear state, set a contract to find,  & mock updateValueCallback
            beforeEach((done)=>{

                eth_db = new pouchdb('contracts'); 
                eth.units.setDB(eth_db);

                animist.resetSendQueue();
                animist.hasTxCharacteristic.updateValueCallback = (val) => {};
                fns.callback = (code) => {}; 

                eth_db.put(mock_contract).then(() => {
                    done();
                });
            });

            afterEach((done)=>{ 
                // Clean up
                animist.resetSendQueue();
                eth_db.destroy().then(() => { done() });
            }); 

            it('should respond w/ RESULT_SUCCESS if a tx matching the address is found', (done)=>{

                 // Test state in success callback - make sure you run the timeout too
                // or it will f the subsequent tests
                fns.callback = (code) => { 
                    expect(code).to.equal(config.codes.RESULT_SUCCESS);
                    setTimeout(done, 55); 
                };
        
                animist.onHasTxWrite(req, null, null, fns.callback);
                
            });

            it('should push the tx into the send queue', (done) => {

                let initial_queue_size, new_queue_size;

                initial_queue_size = animist.getSendQueue().length;
                
                // Test state in success callback - make sure you run the timeout too
                // or it will f the subsequent tests
                fns.callback = (code) => { 
                    expect(code).to.equal(config.codes.RESULT_SUCCESS);
                    new_queue_size = animist.getSendQueue().length;
                    expect(initial_queue_size).to.equal(0);
                    expect(new_queue_size).to.be.gt(0);
                    setTimeout(done, 55); 
                };
            
                // Run fn
                animist.onHasTxWrite(req, null, null, fns.callback)
        
            });

            it('should begin writing/processing the send queue', (done) => {

                let tx, full_queue, full_queue_size, new_queue_size, expected_queue_size;
                
                // Clean up
                animist.resetSendQueue();
            
                // Test post callback . . . in a timeout.
                fns.callback = (code) => { 

                    full_queue = animist.getSendQueue();
                    full_queue_size = full_queue.length;
            
                    chai.spy.on(animist.hasTxCharacteristic, 'updateValueCallback');

                    setTimeout(() => {
                        expect(code).to.equal(config.codes.RESULT_SUCCESS);
                        new_queue_size = animist.getSendQueue().length;
                        expect(animist.hasTxCharacteristic.updateValueCallback).to.have.been.called();
                        expect(new_queue_size).to.equal(full_queue_size - 1);
                        done();
                    }, 55);
                };

                // Run
                animist.onHasTxWrite(req, null, null, fns.callback);
                
            });

            // **** FIX WHEN GETTX IS ACTUALLY WRITTEN - E.G. WE CAN MOCK NO DISCOVERY ******
            /*it('should respond w/ NO_TX_FOUND if there is no tx matching the address', ()=>{
                    
                config.fakeTx.authority = 'not_this_address';
                chai.spy.on(fns, 'callback');
                animist.onHasTxWrite(req, null, null, fns.callback)
                
                expect(fns.callback).to.have.been.called.with(config.codes.NO_TX_FOUND);

            });*/

            it('should respond w/ error code if req is un-parseable', ()=>{

                req = "0x5[w,r,0,,n,g";
                chai.spy.on(fns, 'callback');

                animist.onHasTxWrite(req, null, null, fns.callback);
                expect(fns.callback).to.have.been.called.with(config.codes.INVALID_JSON_IN_REQUEST);
                
            });

        });

        describe('onHasTxIndicate', ()=>{
            var req, fns = {};


            // Run hasTxWrite: Clear state & mock updateValueCallback
            beforeEach(() =>{

                animist.resetSendQueue();
                animist.hasTxCharacteristic.updateValueCallback = (val) => {};
                animist.queueTx(config.fakeTx);

            });

            it('should de-queue & send the next packet', (done)=>{
                
                let queue = animist.getSendQueue();
                let initial_queue_size = queue.length;
                let initial_queue_element = queue[0];

                chai.spy.on(animist.hasTxCharacteristic, 'updateValueCallback');
                animist.onHasTxIndicate();

                setTimeout(()=>{
                    queue = animist.getSendQueue();
                    expect(animist.hasTxCharacteristic.updateValueCallback).to.have.been.called.with(initial_queue_element);
                    expect(queue.length).to.equal(initial_queue_size - 1);
                    done();
                },0);

            });

            it('should send EOF signal if queue is empty', (done)=>{

                let expected = new Buffer(config.codes.EOF);
                chai.spy.on(animist.hasTxCharacteristic, 'updateValueCallback');

                animist.resetSendQueue();
                animist.onHasTxIndicate();

                setTimeout(()=>{
                    expect(animist.hasTxCharacteristic.updateValueCallback).to.have.been.called.with(expected);
                    done();
                },10);

            });

            it('should do nothing post-EOF', (done)=>{

                // Run EOF
                animist.resetSendQueue();
                animist.onHasTxIndicate();

                setTimeout(()=>{
                    
                    // Post EOF
                    chai.spy.on(animist.hasTxCharacteristic, 'updateValueCallback');
                    animist.onHasTxIndicate();

                    setTimeout(() =>{
                        expect(animist.hasTxCharacteristic.updateValueCallback).not.to.have.been.called();
                        done();
                     },0)
                },0);
            });
        });
    });
});
