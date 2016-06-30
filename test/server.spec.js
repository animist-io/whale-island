const server = require('../lib/server.js');
const config = require('../lib/config.js');
const account = require('../test/mocks/wallet.js');
const wallet = require('eth-lightwallet');

const chai = require('chai');
const spies = require('chai-spies');
const expect = chai.expect;

chai.use(spies);

describe('Characteristic Request Handlers', () => {

    var animist, address, keystore, fns = {};
    
    // Prep one account for all tests
    before(() => {
        let json = JSON.stringify(account.keystore);
        keystore = wallet.keystore.deserialize(json);

        
        keystore.generateNewAddress(account.key, 1);
        address = keystore.getAddresses()[0];
        console.log(address);
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
        console.log('address:' + address);

    });

});
