'use strict'

const web3 = require('web3');
const Promise = require('bluebird');
const util = require("ethereumjs-util");
const config = require('../lib/config');
const pouchdb = require('pouchdb');
const rs = require('randomstring');

let contracts = (!process.env.TRAVIS) ? new pouchdb('http://localhost:5984/contracts') : new pouchdb('contracts');

// Recovers address used to sign a msg and returns the hex val as a string.
// Returns undefined if js-util throws an error. (This fn lifted from eth-lightwallet)
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

// Extract address from signed pin and search DB for contract referencing it: 
// Also try w/ old pin since interaction might be on temporal seam.
// Attach caller to contract object and resolve it.
// Reject if contract not found or address can't be recovered.
const getTx = exports.getTx = function(pins, signed){

    let tx, address;    
    address = recover(pins[0], signed) || recover(pins[1], signed);

    if (address) {
        
        return new Promise((resolve, reject) => {         
            contracts.get(address)     
                .then( contract => { 
                    contract.caller = address; 
                    resolve(contract) })
                .catch( reject );
        });

    } else return Promise.reject();
    
}

exports.units = {
    setDB : (db) => { contracts = db }
}


const authTx = exports.authTx = function(){};
const signTx = exports.signTx = function(){};
const publishContract = exports.signTx = function(){};

