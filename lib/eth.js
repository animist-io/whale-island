'use strict'

const web3 = require('web3');
const util = require("ethereumjs-util");
const config = require('../lib/config');

const recover = exports.recover = function (rawMsg, signed) {

    try {
    
        let msgHash = util.sha3(rawMsg);
        let pub = util.ecrecover(msgHash, signed.v, signed.r, signed.s);
        let addr = util.pubToAddress(pub);
        return addr.toString('hex');

    } catch (err) {
        return undefined;
    }
};

// FAKE:
const getTx =  exports.getTx = function(pin, signed){

    let address = recover(pin, signed);
    let fakeTx = config.fakeTx;
    return (fakeTx.authority === address ) ? JSON.stringify(fakeTx) : null;   
}
