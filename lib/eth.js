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

exports.db = () => contracts;
// ----------------------------- Web3 Testing (test-rpc) ----------------------------------
let testRpc = new Web3.providers.HttpProvider("http://localhost:8545");
const web3 = new Web3(testRpc);
const deviceAccount = web3.eth.accounts[0];

// ----------------------------- Web3 Development (morden) --------------------------------
// Stub
// ----------------------------- Web3 Production  -----------------------------------------
// Stub

//const method = Promise.promisify(web3.eth.METHOD.bind(web3.eth));

// ---------------------------------  Utilities -----------------------------------------


/** 
 Recovers address used to sign a msg in eth-lightwallet or web3.sign (different formats).
 Will generate non-existent address if data signed and 'rawMsg' are not identical. 
 @method recover
 @param {String} rawMsg: the endpoints currently broadcast pin
 @param {(Object|String)} signedPin: a pin value signed by the callers account
 @returns {String} account: hex prefixed public address of msg signer.
 @returns undefined if ethereumjs-util throws an error during recovery.
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
 Extracts address from signed pin and fetches record from contractsDB with that id.
 Appends caller account number to the contract event record. 
 @method getContract 
 @returns {Promise} record: resolves contract event record
 @returns {Promise} err: rejects with hex code: NO_TX_DB_ERR or NO_TX_ADDR_ERR
*/
const getContract = exports.getContract = function(pins, signed){

    let res = {};
    let address = recover(pins[0], signed);

    if (address) {

        return contracts.get(address)     
            .then( doc => { 
                res.code = web3.eth.getCode(doc.contractAddress);
                res.account = doc._id;
                res.authority = doc.authority;
                res.contractAddress = doc.contractAddress;
                return res;
            })
            .catch( err => Promise.reject(codes.NO_TX_DB_ERR) )

    } else return Promise.reject(codes.NO_TX_ADDR_ERR);    
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
        // Get contract address, compose instance & invoke verifyPresence
        return contracts.get(address)
            .then( doc => {
                instance = animistContract.at(doc.contractAddress);
                return instance.verifyPresence(deviceAccount, Date.now(), {from: deviceAccount});
            })
            .catch(err => Promise.reject(codes.NO_TX_DB_ERR));
        
    } else return Promise.reject(codes.NO_TX_ADDR_ERR);

};

/**
 * Prints tx signed by client to blockchain. A wrapper for web3 sendRawTransaction.
 * @method submitTx 
 * @param {String} tx: a signed transaction
 * @returns {String} hash: txHash of sendRawTransaction 
 */
const submitTx = exports.submitTx = function(tx){
    return web3.eth.sendRawTransaction(tx);
}

/**
 Waits for auth tx to be mined then submits tx. Stores signedTx transaction hash in the contractDB 
 record on sendRawTx. Updates contract record with auth status when pending, successful, failed.
 @method submitTxWhenAuthed
 @param {String} authTxHash: hash of pending presence verification tx submitted by animist device 
 @param {String} signedTx: signed tx submittable w/ eth.sendRawTransaction
 @param {String} address: the client account address
 @param {Function} cb: optional callback for unit testing. 
*/
const submitTxWhenAuthed = exports.submitTxWhenAuthed = function( authTxHash, signedTx, address, cb ){
    
    let mined, loop, submittedTxHash, gasLimit, waitCycles = 0;
    
    // Define callback if missing
    (!cb) ? cb = ()=>{} : null;

    // Fetch contract record.
    contracts.get(address)

        // Mark contract as 'auth pending' in contractsDB
        .then( doc => {
            contracts.put({
                _id: address,
                _rev: doc._rev,
                authStatus: 'pending', 
                authTxHash: authTxHash,
                submittedTxHash: null
            })

        // Query blockchain about auth every ~20 sec
        .then( res => { 
            gasLimit = web3.eth.getTransaction(authTxHash).gas; 
            
            loop = setInterval( () => {
                
                // Cap number of times to loop.
                if( waitCycles >= config.MAX_CONFIRMATION_CYCLES){
                    clearInterval(loop);
                    cb(waitCycles);
                
                // Check if auth transaction was mined (i.e. blocknumber not null)
                } else if (web3.eth.getTransaction(authTxHash).blockNumber){ 
                    
                    mined = web3.eth.getTransactionReceipt(authTxHash); 
                    
                    // Mark auth as failed on error, cancel loop.
                    if (mined.gasUsed === gasLimit) {
                        
                        contracts.put({
                            _id: address,
                            _rev: res.rev,
                            authStatus: 'failed',
                            authTxHash: authTxHash,
                            submittedTxHash: null
                        })
                        .then( res => { clearInterval(loop); cb(res) })
                        .catch( err => clearInterval(loop))
                    
                    // Or send raw transaction, update db, cancel loop.
                    } else {
            
                        let hash = web3.eth.sendRawTransaction(signedTx);
                        contracts.put({
                            _id: address,
                            _rev: res.rev,
                            authStatus: 'success',
                            authTxHash: authTxHash,
                            submittedTxHash: hash 
                        })
                        .then( res => { clearInterval(loop); cb(res) })
                        .catch( err => clearInterval(loop))  
                    };

                // Increment loop counter
                } else {
                    waitCycles++;
                }
        
            }, config.MINING_CHECK_INTERVAL) }) 
        })
        .catch( err => console.log('submitTxWhenAuthed is failing: ' + err));
}

// Covenience methods for unit tests
exports.units = {
    setDB : db => { contracts = db }, // Set local db to testing env db
    setMiningCheckInterval: val => config.MINING_CHECK_INTERVAL = val,
    setConfCycles: val => config.MAX_CONFIRMATION_CYCLES = val, // Mock conf cycles.
    getWeb3 : () => { return web3 }   // Make this instance of web3 avail to mock it.
}

const signTx = exports.signTx = function(){};
const publishContract = exports.publishContract = function(){};

