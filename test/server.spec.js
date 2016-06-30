let config = require('../lib/config.js');

const server = require('../lib/server.js');
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
                // Stack size should be 3, last element should have length: 3
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

        var animist, fns = {};
        
        
        before(() => {
            
        });

        // Instantiate a new server before each test
        beforeEach(() => { 
            animist = new server.AnimistServer();
        });

        describe('onPinRead', () => {
          it('should respond to request w/ the current pin', () => {
            
            let codes = config.codes;
            let pin_to_buffer = new Buffer(animist.getPin());
            fns.callback = (code, pin) => {};
            
            chai.spy.on(fns, 'callback');
            server.onPinRead(null, fns.callback);

            expect(fns.callback).to.have.been.called.with(codes.RESULT_SUCCESS, pin_to_buffer);

          });
        });

        describe('onHasTxWrite', () => {
            

        });

    });
});
