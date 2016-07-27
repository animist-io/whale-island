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

// ----------------------------- Web3 Testing (test-rpc) ----------------------------------
let testRpc = new Web3.providers.HttpProvider("http://localhost:8545");
const web3 = new Web3(testRpc);
const deviceAccount = web3.eth.accounts[1];

// ----------------------------- Web3 Development (morden) --------------------------------
// Stub
// ----------------------------- Web3 Production  -----------------------------------------
// Stub

//const method = Promise.promisify(web3.eth.METHOD.bind(web3.eth));

// ---------------------------------  Utilities -----------------------------------------
// Recovers address used to sign a msg in eth-lightwallet or web3.sign (different formats) 
// and returns the hex val as a hex prefixed string. Returns undefined if js-util throws an error. 
// (This code from eth-lightwallet, ethereumjs-util)
const recover = exports.recover = function (rawMsg, signed) {

    try {
        
        // Check if this is a web3 signature & covert to obj.
        (!signed.hasOwnProperty('v'))
            ? signed = util.fromRpcSig(signed) 
            : null;

        let msgHash = util.sha3(rawMsg);
        let pub = util.ecrecover(msgHash, signed.v, signed.r, signed.s);
        let addr = util.pubToAddress(pub);
        return util.addHexPrefix(addr.toString('hex'));

    } catch (err) {
        return undefined;
    }
};

// ---------------------------------   Core  --------------------------------------------

// getTx: Queries blockchain for transaction receipt. 
// Resolves object { blockNumber: int || null if pending, nonce: int, gas: int } 
// Rejects w/ NO_TX_DB_ERR
const getTx = exports.getTx = function(txHash){
    
    let tx;
    return new Promise((resolve, reject) => {         
        web3.eth.getTransaction(txHash, (err, tx ) => {
            (err || !tx ) 
                ? reject(codes.NO_TX_DB_ERR)
                : resolve({blockNumber: tx.blockNumber, nonce: tx.nonce, gas: tx.gas})
        });
    });
};

// getBlockNumber: Wraps web3.eth.blockNumber
const getBlockNumber = exports.getBlockNumber = function(){
    return web3.eth.blockNumber
}


// Extract address from signed pin and search contractsDB for contract referencing it:
// Attach caller to contract object and resolve it.
// Reject if contract not found or address can't be recovered.
const getContract = exports.getContract = function(pins, signed){

    let address = recover(pins[0], signed);

    if (address) {
        return new Promise((resolve, reject) => {         

            contracts.get(address)     
                .then( contract => { 
                    contract.caller = address; 
                    resolve(contract); 
                })
                .catch( err => reject(codes.NO_TX_DB_ERR) )
        });
    } else return Promise.reject(codes.NO_TX_ADDR_ER);    
}

// authTx: Invokes verifyPresence on the contract discovered in the 
// contractsDB. verifyPresence prints caller was here, 'timestamped' now, to chain.
// Resolves txHash of pending transaction or rejects w/ NO_TX_FOUND.
const authTx = exports.authTx = function(pins, signed){

    let instance, hash;
    let animistContract = web3.eth.contract(config.abi);
    let address = recover(pins[0], signed);   
    
    if (address){
        return new Promise((resolve, reject) => {         
            
            // Get contract address, compose instance & invoke verifyPresence
            contracts.get(address)
                .then( doc => {
                   
                    instance = animistContract.at(doc.contract);
                    hash = instance.verifyPresence(deviceAccount, Date.now(), {from: deviceAccount});
                    resolve(hash);
                })
                .catch( err => reject(codes.NO_TX_DB_ERR) );
        });
    } else {
        return Promise.reject(codes.NO_TX_ADDR_ERR);
    }
};

exports.units = {
    setDB : (db) => { contracts = db }
}

const signTx = exports.signTx = function(){};
const publishContract = exports.publishContract = function(){};

