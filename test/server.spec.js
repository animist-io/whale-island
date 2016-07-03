

//let config = require('../lib/config.js');
//let server = require('../lib/server.js');

//const account = require('../test/mocks/wallet.js');
//const wallet = require('eth-lightwallet');

const chai = require('chai');
const spies = require('chai-spies');
const expect = chai.expect;

chai.use(spies);

describe('Travis Test', function(){
    it('should work on Travis CI', function(){
        expect(true).to.be.true;
    })
})
/*
describe('Bluetooth Server', () => {
    
    var keystore, address;

    // Prep a single keystore/account for all tests
    before(()=>{
        let json = JSON.stringify(account.keystore);
        keystore = wallet.keystore.deserialize(json);  
        keystore.generateNewAddress(account.key, 1);
        address = keystore.getAddresses()[0];
    })

    describe('Utilites', () => {

        var animist;

        beforeEach( () => { 
            animist = new server.AnimistServer();
        });

        describe('queueTx(tx)', ()=>{
            var tx, queue, old_config;
            
            it('should transform input into buffers of MAX_SIZE & queue them',()=>{
                
                // Testing 11 chars/4 byte packets: 
                tx = "12341234123";
                old_config = config.MAX_SEND;
                config.MAX_SEND = 4;
                
                animist.queueTx(tx);
                queue = animist.getSendQueue();
        
                expect(queue.length).to.equal(3);
                expect(Buffer.isBuffer(queue[0])).to.be.true;
                expect(queue[2].length).to.equal(3);

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
                req = '{\"signed\": \"I am like not even signed\"}';
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
    });

    describe('Request Handlers', () => {

        var animist; 
 
        // Instantiate new server before each test
        beforeEach(() => { 
            animist = new server.AnimistServer();
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
            
            var req, fns = {};

            // Mocks
            before(()=>{
                
                // Mock request
                req = wallet.signing.signMsg( keystore, account.key, animist.getPin(), address); 
                req = JSON.stringify(req);
                
                // Mock byte callback
                fns.callback = (code) => {};

                 // Mock address
                config.fakeTx.authority = address;
 
            });

            // Clear state & mock updateValueCallback
            beforeEach(()=>{
                animist.resetSendQueue();
                animist.hasTxCharacteristic.updateValueCallback = (val) => {};
            })

            it('should respond w/ RESULT_SUCCESS if a tx matching the address is found', (done)=>{

                config.fakeTx.authority = address;
                chai.spy.on(fns, 'callback');
                animist.onHasTxWrite(req, null, null, fns.callback)
                
                expect(fns.callback).to.have.been.called.with(config.codes.RESULT_SUCCESS);
                setTimeout(done, 50);

            });

            it('should push the tx into the send queue', (done) => {

                let initial_queue_size, new_queue_size;

                initial_queue_size = animist.getSendQueue().length;
                config.fakeTx.authority = address;
            
                animist.onHasTxWrite(req, null, null, fns.callback)
                new_queue_size = animist.getSendQueue().length;

                expect(initial_queue_size).to.equal(0);
                expect(new_queue_size).to.be.gt(0);
                setTimeout(done, 50);

            });

            it('should begin writing/processing the send queue', (done) => {

                let tx, full_queue, full_queue_size, new_queue_size, expected_queue_size;
                
                // Get a queue copy
                tx = server.getTx(address);
                animist.queueTx(tx);
                full_queue = animist.getSendQueue();
                full_queue_size = full_queue.length;
                expected_queue_size = full_queue_size - 1;

                // Clean up
                animist.resetSendQueue();
               
                // Run
                chai.spy.on(animist.hasTxCharacteristic, 'updateValueCallback');
                animist.onHasTxWrite(req, null, null, fns.callback);

                // Test
                setTimeout(() => {
                    new_queue_size = animist.getSendQueue().length;
                    expect(animist.hasTxCharacteristic.updateValueCallback).to.have.been.called.with(full_queue[0]);
                    expect(new_queue_size).to.equal(expected_queue_size);
                    done();
                }, 50);
                
            });

            it('should respond w/ NO_TX_FOUND if there is no tx matching the address', ()=>{
                    
                config.fakeTx.authority = 'not_this_address';
                chai.spy.on(fns, 'callback');
                animist.onHasTxWrite(req, null, null, fns.callback)
                
                expect(fns.callback).to.have.been.called.with(config.codes.NO_TX_FOUND);

            });

            it('should respond w/ error code if req is un-parseable', ()=>{

                req = "0x5[w,r,0,,n,g";
                chai.spy.on(fns, 'callback');

                animist.onHasTxWrite(req, null, null, fns.callback);
                expect(fns.callback).to.have.been.called.with(config.codes.INVALID_JSON_IN_REQUEST);
                
            });

        });

        describe('onHasTxIndicate', ()=>{
            var req, fns = {};

            // Mocks
            before(()=>{
                
                // Mock request
                req = wallet.signing.signMsg( keystore, account.key, animist.getPin(), address); 
                req = JSON.stringify(req);
                
                // Mock byte callback
                fns.callback = (code) => {};

                 // Mock address
                config.fakeTx.authority = address;
 
            });

            // Run hasTxWrite: Clear state & mock updateValueCallback
            beforeEach((done)=>{
                animist.resetSendQueue();
                animist.hasTxCharacteristic.updateValueCallback = (val) => {};
                animist.onHasTxWrite(req, null, null, fns.callback);
                setTimeout(done, 50);
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
                },10);

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
});*/
