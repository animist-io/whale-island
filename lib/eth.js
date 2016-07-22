'use strict'

// ----------------------------------- Imports -----------------------------------------
// Ethereum
const Web3 = require('web3');
const util = require("ethereumjs-util");

// NPM 
const Promise = require('bluebird');
const pouchdb = require('pouchdb');
const rs = require('randomstring');

// Animist
const config = require('../lib/config');

// --------------------------------- Locals/Setup -----------------------------------------
const codes = config.codes;

let contracts = (!process.env.TRAVIS) 
                    ? new pouchdb('http://localhost:5984/contracts') 
                    : new pouchdb('contracts');

let testRpc = new Web3.providers.HttpProvider("http://localhost:8545");
const web3 = new Web3(testRpc);

//const method = Promise.promisify(web3.eth.METHOD.bind(web3.eth));

// ---------------------------------  Utilities -----------------------------------------
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

// ---------------------------------   Core  --------------------------------------------
// Extract address from signed pin and search DB for contract referencing it:
// Attach caller to contract object and resolve it.
// Reject if contract not found or address can't be recovered.
const getTx = exports.getTx = function(pins, signed){

    let address = recover(pins[0], signed);

    if (address) {
        return new Promise((resolve, reject) => {         

            contracts.get(address)     
                .then( contract => { 
                    contract.caller = address; 
                    resolve(contract); 
                })
                .catch( () => { 
                    reject(codes.NO_TX_FOUND);
                })
        });
    } else return Promise.reject(codes.NO_TX_FOUND);    
}

// authTx: Invokes verifyPresence on the contract discovered in the 
// contractsDB - publishes that caller was here 'timestamped' now.
// Resolves txHash of verifyPresence or rejects w/ NO_TX_FOUND.
const authTx = exports.authTx = function(pins, signed){

    let instance, hash;
    let animistContract = web3.eth.contract(config.abi);
    let address = recover(pins[0], signed);   
    
    if (address){
        return new Promise((resolve, reject) => {         
            
            contracts.get(address)
                .then( doc => {
                    instance = animistContract.at(doc.contract);
                    hash = instance.verifyPresence(address, Date.now());
                    resolve(hash);
                })
                .catch( error => { 
                    reject(codes.NO_TX_FOUND) 
                });
        });

    } else return Promise.reject(codes.NO_TX_FOUND);
};

exports.units = {
    setDB : (db) => { contracts = db }
}



const signTx = exports.signTx = function(){};
const publishContract = exports.publishContract = function(){};

