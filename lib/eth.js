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


/** 
 Recovers address used to sign a msg in eth-lightwallet or web3.sign (different formats) 
 and returns the hex val as a hex prefixed string. Returns undefined if js-util throws an error. 
 @method recover
 @param {String} rawMsg: the endpoints currently broadcast pin
 @param {Object | String} signedPin: a pin value signed by the callers account
*/
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

/** 
 Returns current blocknumber. (Wraps web3.eth.blockNumber). 
 @method getBlockNumber
 @returns {Number} blockNumber
*/
const getBlockNumber = exports.getBlockNumber = function(){
    return web3.eth.blockNumber
}

/**
  Queries blockchain for transaction receipt.
  @method getTx
  @returns {Promise} tx: resolves { blocknumber: int (or null), nonce: int, gas: int }
  @returns {Promise} err: rejects w/ hex code: NO_TX_DB_ERR
*/
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

/** 
 Extracts address from signed pin and searches contractsDB for contract creation event
 referencing it. Appends caller account number to the contract event record. 
 @method getContract 
 @returns {Promise} record: resolves contract event record
 @returns {Promise} err: rejects with hex code: NO_TX_DB_ERR
*/
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

/**
 Invokes verifyPresence on the contract discovered in the contractsDB. 
 verifyPresence prints caller was here, 'timestamped' now, to chain.
 @method authTx
 @returns {Promise} txHash: resolves hash string of pending tx
 @returns {Promise} err: rejects w/ hex code: NO_TX_FOUND
*/
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

/**
 Waits for auth tx to be mined, then submits tx. Stores signedTx transaction hash in the contractDB 
 record when it is mined. Updates contract record with auth status when pending, successful, failed.
 @method submitTxWhenAuthed
 @param {String} authTxHash: hash of pending presence verification tx submitted by animist device 
 @param {String} signedTx: signed tx submittable w/ eth.sendRawTransaction
 @param {String} address: the client account address
 @param {Function} cb: optional callback for unit testing. 
*/
const submitTxWhenAuthed = exports.submitTxWhenAuthed = function( authTxHash, signedTx, address, cb ){
    
    let mined, loop, submittedTxHash, gasLimit;
    
    // Fetch contract record.
    contract.get(address)

        // Mark contract as 'auth pending' in contractsDB
        .then( doc => {
            return contracts.put({
                _id: address,
                _rev: doc._rev,
                authStatus: 'pending', 
                authTxHash: authTxHash,
                submittedTxHash: null
            });
        })

        // Query blockchain about auth every ~20 sec
        .then( res => { 

            gasLimit = web3.getTransaction(authTxHash).gas; 
            
            loop = setInterval( () => {
                
                if (web3.getTransaction(authTxHash).blockNumber){ 
                    mined = web3.getTransactionReceipt(authTxHash); 
                    
                    // Mark auth as failed on error, cancel loop.
                    if (mined.gasUsed === gasLimit) {
                        contracts.put({
                            _id: address,
                            _rev: res._rev,
                            authStatus: 'failed'
                        })
                        .finally( res => clearInterval(loop) && cb() )
                    
                    // Or send raw transaction, update db, cancel loop.
                    } else {
                        submittedTxHash = web3.eth.sendRawTransaction(signedTx);
                        contracts.put({
                            _id: address,
                            _rev: res._rev,
                            authStatus: 'success',
                            submittedTxHash: submittedTxHash 
                        })
                        .finally( res => clearInterval(loop) && cb() )
                    };
                };
            }, config.CHECK_IF_MINED_INTERVAL) 
        })
        .catch( err => console.log('submitTxWhenAuthed is failing: ' + err));
}

// Covenience methods for unit tests
exports.units = {
    setDB : db => { contracts = db }, // Set local db to testing env db
    getWeb3 : () => { return web3 }   // Mock web3
}

const signTx = exports.signTx = function(){};
const publishContract = exports.publishContract = function(){};

