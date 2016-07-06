'use strict'

const web3 = require('web3');
const util = require("ethereumjs-util");
const config = require('../lib/config');
const pouchdb = require('pouchdb');
const rs = require('randomstring');

let contracts = (!process.env.TRAVIS) ? new pouchdb('http://localhost:5984/contracts') : new pouchdb('contracts');

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
// Recover address from signed pin and search DB: 
// Also try w/ old pin since interaction might be on temporal seam.
const getTx = exports.getTx = function(pins, signed){

    let tx, address;    
    address = recover(pins[0], signed) || recover(pins[1], signed);

    return (address) ? 
        contracts.get(address) : 
        Promise.reject();
   
}

exports.units = {
    setDB : (db) => { contracts = db }
}


const authTx = exports.authTx = function(){};
const signTx = exports.signTx = function(){};
''
const publishContract = exports.signTx = function(){};

