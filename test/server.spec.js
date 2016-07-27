'use strict'

// ----------------------------------- Imports -----------------------------------------

// Local
let config = require('../lib/config.js');
let server = require('../lib/server.js');
let eth = require('../lib/eth.js');

const account = require('../test/mocks/wallet.js');
const transaction = require('../test/mocks/transaction.js');
const wallet = require('eth-lightwallet');

// Ethereum 
const Web3 = require('web3');

// Misc NPM
const Promise = require('bluebird');
const pouchdb = require('pouchdb');

// Testing
const chai = require('chai');
const spies = require('chai-spies');
const chaiAsPromised = require("chai-as-promised");

// ----------------------------------- Setup -----------------------------------------
const expect = chai.expect;
const should = chai.should;
chai.use(spies);
chai.use(chaiAsPromised);

const provider = new Web3.providers.HttpProvider('http://localhost:8545');
const web3 = new Web3(provider);

// ----------------------------------- Tests -----------------------------------------
describe('Bluetooth Server', () => {
    
    var keystore, address, hexAddress;

    // Prep a single keystore/account for all tests
    before(() => {
        let json = JSON.stringify(account.keystore);
        keystore = wallet.keystore.deserialize(json);  
        keystore.generateNewAddress(account.key, 1);
        address = keystore.getAddresses()[0]; // Lightwallets addresses are not prefixed.
        hexAddress = '0x' + address;          // Eth's are - we recover them as this.
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

        describe('parseGetContractRequest(req)', () =>{

            var req, output, msg;

            it('should return a correctly formatted object representing a signed msg', () =>{

                msg = 'a message';
                req = wallet.signing.signMsg( keystore, account.key, msg, address); 
                req = JSON.stringify(req);
                
                output = animist.parseGetContractRequest(req);

                expect( output.ok).to.be.true;
                expect( typeof output.val).to.equal('object');
                expect( Buffer.isBuffer(output.val.r)).to.be.true;
                expect( Buffer.isBuffer(output.val.s)).to.be.true;

            });

            it('should return error if req is not parse-able as a signed msg', ()=>{
                req = '{\"signed\": \"I am not signed\"}';
                output = animist.parseGetContractRequest(req);

                expect(output.ok).to.equal(false);
                expect(output.val).to.equal(config.codes.NO_SIGNED_MSG_IN_REQUEST);
            });

            it('should return error if req is not JSON formatted', ()=>{

                req = "0x5[w,r,0,,n,g";
                output = animist.parseGetContractRequest(req);

                expect(output.ok).to.equal(false);
                expect(output.val).to.equal(config.codes.INVALID_JSON_IN_REQUEST);

            });

        });

        describe('parseGetTxRequest(req)', () => {

            let hash, input, output;
            it( 'should return an object containing a correctly formatted txHash', () => {
                hash = '0xf087407379e66de3d69da365826272f7750e6c978f5c2d034296de168f571e4d';
                input = JSON.stringify(hash);
                output = animist.parseGetTxRequest(input);
                expect(output.ok).to.be.true;
                expect(output.val).to.equal(hash);
            })

            it( 'should error w/ INVALID_TX_HASH if input is not a string', ()=>{
                hash = '{ hello: "I am not a string" }';
                input = JSON.stringify(hash);
                output = animist.parseGetTxRequest(input);
                expect(output.ok).to.be.false;
                expect(output.val).to.equal(config.codes.INVALID_TX_HASH);

            });

            it( 'should error w/ INVALID_TX_HASH if input is not hex prefixed', ()=> {
                hash = 'f087407379e66de3d69da365826272f7750e6c978f5c2d034296de168f571e4d';
                input = JSON.stringify(hash);
                output = animist.parseGetTxRequest(input);
                expect(output.ok).to.be.false;
                expect(output.val).to.equal(config.codes.INVALID_TX_HASH);
            });

            it( 'should error w/ INVALID_TX_HASH if input does not repr. 32bytes', () => {
                hash = '0xf087407379e66de3d69da365826272f7750e6c978f5c2d034296de168f';
                input = JSON.stringify(hash);
                output = animist.parseGetTxRequest(input);
                expect(output.ok).to.be.false;
                expect(output.val).to.equal(config.codes.INVALID_TX_HASH);
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
                let doc = {_id: '55555', expires: '12345', account: "0x25345454564545"  };
                let tx = { caller: "0x25345454564545" };
        
                db.put(doc).then(()=>{ 
                    expect(animist.isValidSession('55555', tx)).to.be.fulfilled.notify(done);        
                }).catch((err) => {
                    expect('Test should not error').to.equal('true');
                });

            });

            it('should reject if the id param is not a string', function(done){
                expect(animist.isValidSession({obj: 5})).to.be.rejected.notify(done);
            });

            it('should reject if the session record is not found in the DB', function(done){
                let doc = {_id: '55555', expires: '12345', account: "0x25345454564545"  };
                let tx = { caller: "0x25345454564545" };

                db.put(doc).then(()=>{
                    expect(animist.isValidSession('77777', tx)).to.be.rejected.notify(done);        
                }).catch((err) => {
                    expect('Test should not error').to.equal('true');
                });
            });

            it('should reject if the sessionId was not issue to the caller', function(done){
                let doc = {_id: '55555', expires: '12345', account: "0x25345454564545"  };
                let tx = { caller: "0x00000000" };

                db.put(doc).then(()=>{
                    expect(animist.isValidSession('55555', tx)).to.be.rejected.notify(done);        
                }).catch((err) => {
                    expect('Test should not error').to.equal('true');
                });
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

            it('should save session data associated w/ caller account to the DB', function(done){

                let fakeTx = config.fakeTx;
                fakeTx.caller = "0x25345454564545";

                animist.startSession(fakeTx).then(()=>{
                    let expected = {_id: fakeTx.sessionId, expires: fakeTx.expires, account: fakeTx.caller }
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

        describe('onGetPin', () => {


          it('should respond to request w/ the current pin', () => {
            
            let fns = {};
            let codes = config.codes;
            let pin_to_buffer = new Buffer(animist.getPin());
            fns.callback = (code, pin) => {};
            
            chai.spy.on(fns, 'callback');
            animist.onGetPin(null, fns.callback);

            expect(fns.callback).to.have.been.called.with(codes.RESULT_SUCCESS, pin_to_buffer);

          });
        });

        describe('onGetTxStatus', () => {

            let hash, input, fns = {}, updateValueCallback, accounts = web3.eth.accounts;
            
            beforeEach(() => {
                fns.callback = () => {};
                hash = web3.eth.sendTransaction({from: accounts[0], to: accounts[1], value: 100 });
                input = JSON.stringify(hash);
                
            });

            it('should respond w/ RESULT_SUCCESS', (done) => {

                fns.callback = (code) => { 
                    expect(code).to.equal(config.codes.RESULT_SUCCESS);
                };

                updateValueCallback = val => { done() };
                animist.getTxStatusCharacteristic.onSubscribe(null, updateValueCallback);
                animist.onGetTxStatus(input, null, null, fns.callback );

            });

            it( 'should send data about the queried tx', (done) => {
                
                let tx = web3.eth.getTransaction(hash);
                let res = {blockNumber: tx.blockNumber, nonce: tx.nonce, gas: tx.gas};
                let expected_send = new Buffer(JSON.stringify(res));

                updateValueCallback = (val) => {
                    val.should.be.expected_send;
                    done();
                };
                animist.getTxStatusCharacteristic.onSubscribe(null, updateValueCallback);
                animist.onGetTxStatus( input, null, null, fns.callback );
            });

            it('should respond with INVALID_TX_HASH if input is malformed', (done) => {
                let malformed = '0x000000000000000012345';
                let malformed_input = JSON.stringify(malformed);
                
                fns.callback = (code) => { 
                    expect(code).to.equal(config.codes.INVALID_TX_HASH);
                    done();
                };

                chai.spy.on(fns, 'callback');
                animist.onGetTxStatus(malformed_input, null, null, fns.callback );
            });

            it('should respond with NO_TX_DB_ERR if unable to find tx', (done) => {
                let missing = '0xf087407379e66de3d69da365826272f7750e6c978f5c2d034296de168f500000';
                let missing_input = JSON.stringify(missing);
                let expected_send = new Buffer(JSON.stringify('null'));

                updateValueCallback = (val) => {
                    val.should.be.expected_send;
                    done();
                };
                animist.getTxStatusCharacteristic.onSubscribe(null, updateValueCallback);
                animist.onGetTxStatus(missing_input, null, null, fns.callback );
            });

        });

        describe('onGetContractWrite', () => {
            
            let req, eth_db, mock_contract, fns = {};
    
            // Mocks
            before(()=>{
                
                // Mock request
                animist = new server.AnimistServer();
                req = wallet.signing.signMsg( keystore, account.key, animist.getPin(), address); 
                req = JSON.stringify(req);

                mock_contract = { _id: hexAddress, authority: hexAddress, contract: config.fakeTx.code };
                
            });

            // Clear state, set a contract to find,  & mock updateValueCallback
            beforeEach((done)=>{

                eth_db = new pouchdb('contracts'); 
                eth.units.setDB(eth_db);

                animist.resetSendQueue();
                animist.getContractCharacteristic.updateValueCallback = (val) => {};
                fns.callback = (code) => {}; 

                eth_db.put(mock_contract).then(() => {
                    done();
                });
            });

            afterEach((done)=>{ 
                eth_db.destroy().then(() => { done() });
            }); 

            it('should respond w/ RESULT_SUCCESS if a tx matching the address is found', (done)=>{

                // Test state in success callback - make sure you run the timeout too
                // or it will f the subsequent tests
                fns.callback = (code) => { 
                    expect(code).to.equal(config.codes.RESULT_SUCCESS);
                    setTimeout(done, 55); 
                };
                animist.onGetContractWrite(req, null, null, fns.callback);
                
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
                animist.onGetContractWrite(req, null, null, fns.callback)
        
            });

            it('should begin writing/processing the send queue', (done) => {

                let tx, full_queue, full_queue_size, new_queue_size, expected_queue_size;
                
                // Clean up
                animist.resetSendQueue();
            
                // Test post callback . . . in a timeout.
                fns.callback = (code) => { 

                    full_queue = animist.getSendQueue();
                    full_queue_size = full_queue.length;
            
                    chai.spy.on(animist.getContractCharacteristic, 'updateValueCallback');

                    setTimeout(() => {
                        new_queue_size = animist.getSendQueue().length;
                        expect(code).to.equal(config.codes.RESULT_SUCCESS);
                        expect(animist.getContractCharacteristic.updateValueCallback).to.have.been.called();
                        expect(new_queue_size).to.equal(full_queue_size - 1);
                        done();
                    }, 55);
                };

                // Run
                animist.onGetContractWrite(req, null, null, fns.callback);
                
            });

            it('should respond w/ NO_TX_DB_ERR if there is no tx matching the address', (done)=>{
                
                // Setup: delete mock from contracts DB
                eth_db.get(hexAddress)
                    .then( doc => { return eth_db.remove(doc) })
                    .then( () => {
                        chai.spy.on(fns, 'callback');
                        setTimeout(() => {
                            expect(fns.callback).to.have.been.called.with(config.codes.NO_TX_DB_ERR);
                            done();
                        }, 55)
                        animist.onGetContractWrite(req, null, null, fns.callback);
                     })
            });

            it('should respond w/ error code if req is un-parseable', ()=>{

                req = "0x5[w,r,0,,n,g";
                chai.spy.on(fns, 'callback');

                animist.onGetContractWrite(req, null, null, fns.callback);
                expect(fns.callback).to.have.been.called.with(config.codes.INVALID_JSON_IN_REQUEST);
                
            });

        });

        describe('onGetContractIndicate', ()=>{
            var req, fns = {};


            // Run getContractWrite: Clear state & mock updateValueCallback
            beforeEach(() =>{

                animist.resetSendQueue();
                animist.getContractCharacteristic.updateValueCallback = (val) => {};
                animist.queueTx(config.fakeTx);

            });

            it('should de-queue & send the next packet', (done)=>{
                
                let queue = animist.getSendQueue();
                let initial_queue_size = queue.length;
                let initial_queue_element = queue[0];

                chai.spy.on(animist.getContractCharacteristic, 'updateValueCallback');
                animist.onGetContractIndicate();

                setTimeout(()=>{
                    queue = animist.getSendQueue();
                    expect(animist.getContractCharacteristic.updateValueCallback).to.have.been.called.with(initial_queue_element);
                    expect(queue.length).to.equal(initial_queue_size - 1);
                    done();
                },0);

            });

            it('should send EOF signal if queue is empty', (done)=>{

                let expected = new Buffer(config.codes.EOF);
                chai.spy.on(animist.getContractCharacteristic, 'updateValueCallback');

                animist.resetSendQueue();
                animist.onGetContractIndicate();

                setTimeout(()=>{
                    expect(animist.getContractCharacteristic.updateValueCallback).to.have.been.called.with(expected);
                    done();
                },10);

            });

            it('should do nothing post-EOF', (done)=>{

                // Run EOF
                animist.resetSendQueue();
                animist.onGetContractIndicate();

                setTimeout(()=>{
                    
                    // Post EOF
                    chai.spy.on(animist.getContractCharacteristic, 'updateValueCallback');
                    animist.onGetContractIndicate();

                    setTimeout(() =>{
                        expect(animist.getContractCharacteristic.updateValueCallback).not.to.have.been.called();
                        done();
                     },0)
                },0);
            });
        });
    });
});
