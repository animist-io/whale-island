let config = require('../lib/config.js');
let server = require('../lib/server.js');

const account = require('../test/mocks/wallet.js');
const wallet = require('eth-lightwallet');

const chai = require('chai');
const spies = require('chai-spies');
const expect = chai.expect;

chai.use(spies);

// Set up a keystore and wallet

describe('Bluetooth Server', () => {
    
    var keystore, address;

    // Prep a keystore/account for all tests
    before(()=>{
        let json = JSON.stringify(account.keystore);
        keystore = wallet.keystore.deserialize(json);  
        keystore.generateNewAddress(account.key, 1);
        address = keystore.getAddresses()[0];
    })

    describe('Utilites', () => {

        describe('stackTx(tx)', ()=>{
            var tx, stack, animist, old_config;
            
            it('should transform input into buffers of MAX_SIZE & put them on the send stack',()=>{
                
                // Testing 11 chars/4 byte packets: 
                tx = "12341234123";
                old_config = config.MAX_SEND;
                config.MAX_SEND = 4;
                
                animist = new server.AnimistServer();
                server.stackTx(tx);
                stack = animist.getSendStack();
        
                expect(stack.length).to.equal(3);
                expect(Buffer.isBuffer(stack[0])).to.be.true;
                expect(stack[2].length).to.equal(3);

                // Cleanup 
                config.MAX_SEND = old_config;

            });
        });

        describe('resetPin', ()=>{
            var animist, new_pin, old_pin;

            it('should generate & set a new 32 character pin', ()=>{
                animist = new server.AnimistServer();
                old_pin = animist.getPin();

                server.resetPin();
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
                
                output = server.parseHasTxRequest(req);

                expect( output.status).to.equal(1);
                expect( typeof output.val).to.equal('object');
                expect( Buffer.isBuffer(output.val.r)).to.be.true;
                expect( Buffer.isBuffer(output.val.s)).to.be.true;

            });

            it('should error correctly if req is not parse-able as a signed msg', ()=>{
                req = '{\"signed\": \"I am like not even signed LOL!!!\"}';
                output = server.parseHasTxRequest(req);

                expect(output.status).to.equal(0);
                expect(output.val).to.equal(config.codes.NO_SIGNED_MSG_IN_REQUEST);
            });

            it('should error correctly if req is not JSON formatted', ()=>{

                req = "0x5[w,r,0,,n,g";
                output = server.parseHasTxRequest(req);

                expect(output.status).to.equal(0);
                expect(output.val).to.equal(config.codes.INVALID_JSON_IN_REQUEST);

            });

        });
    });

    describe('Characteristic Request Handlers', () => {

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
            server.onPinRead(null, fns.callback);

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
                animist.resetSendStack();
                animist.hasTxCharacteristic.updateValueCallback = (val) => {};
            })

            it('should respond w/ RESULT_SUCCESS if a tx matching the address is found', (done)=>{

                config.fakeTx.authority = address;
                chai.spy.on(fns, 'callback');
                server.onHasTxWrite(req, null, null, fns.callback)
                
                expect(fns.callback).to.have.been.called.with(config.codes.RESULT_SUCCESS);
                setTimeout(done, 50);

            });

            it('should push the tx onto the send stack', (done) => {

                let initial_stack_size, new_stack_size;

                initial_stack_size = animist.getSendStack().length;
                config.fakeTx.authority = address;
            
                server.onHasTxWrite(req, null, null, fns.callback)
                new_stack_size = animist.getSendStack().length;

                expect(initial_stack_size).to.equal(0);
                expect(new_stack_size).to.be.gt(0);
                setTimeout(done, 50);

            });

            it('should begin writing/processing the send stack', (done) => {

                let tx, full_stack, full_stack_size, new_stack_size, expected_stack_size;
                
                // Get a stack copy
                tx = server.getTx(address);
                server.stackTx(tx);
                full_stack = animist.getSendStack();
                full_stack_size = full_stack.length;
                expected_stack_size = full_stack_size - 1;

                // Clean up
                animist.resetSendStack();
               
                // Test
                chai.spy.on(animist.hasTxCharacteristic, 'updateValueCallback');
                server.onHasTxWrite(req, null, null, fns.callback);

                setTimeout(() => {
                    new_stack_size = animist.getSendStack().length;
                    expect(animist.hasTxCharacteristic.updateValueCallback).to.have.been.called.with(full_stack[0]);
                    expect(new_stack_size).to.equal(expected_stack_size);
                    done();
                }, 50);
                
            });

            it('should respond w/ NO_TX_FOUND if there is no tx matching the address', ()=>{
                    
                config.fakeTx.authority = 'not_this_address';
                chai.spy.on(fns, 'callback');
                server.onHasTxWrite(req, null, null, fns.callback)
                
                expect(fns.callback).to.have.been.called.with(config.codes.NO_TX_FOUND);

            });

            it('should respond w/ correct error code if req is un-parseable', ()=>{

                req = "0x5[w,r,0,,n,g";
                chai.spy.on(fns, 'callback');

                server.onHasTxWrite(req, null, null, fns.callback);
                expect(fns.callback).to.have.been.called.with(config.codes.INVALID_JSON_IN_REQUEST);
                
            });

        });

    });
});
