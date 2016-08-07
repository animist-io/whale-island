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

//const ethSendRaw = Promise.promisify(web3.eth.sendRawTransaction.bind(web3.eth));

// ---------------------------------  Utilities -------------------------------------------


/** 
 Recovers address used to sign a message, which may be encoded in eth-lightwallet or web3.sign 
 formats. (Will generate non-existent address if data signed and 'rawMsg' are not identical. 
 @method recover.)
 @param {String} rawMsg: the endpoints currently broadcast pin
 @param {(Object|String)} signed: a value signed by the callers account
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
 Wraps web3.eth.blockNumber. 
 @method getBlockNumber
 @returns {Number}
*/
const getBlockNumber = exports.getBlockNumber = function(){
    return web3.eth.blockNumber
}


/**
 * Wraps web3.eth.call. Method should require no gas and no "from" parameter. See onCallTx
 * @method  callTx 
 * @param { String } method: a call to constant public function 
 * @returns { String } hex encoded value per web3
 */
const callTx = exports.callTx = function(method){
    return web3.eth.call(method);
}

/**
  Queries blockchain for transaction receipt.
  @method getTx
  @returns {Promise} Resolves { blocknumber: int (or null), nonce: int, gas: int }
  @returns {Promise} Rejects w/ hex code: NO_TX_DB_ERR
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
 Extracts address from signed pin and looks for record from contractsDB with that id.
 @example
 Sample contract event object:    
 {
 code: '0x453ce...03' (long contract code string), 
 account: '0x757fe...04' (account addr. specified in the contract event, should be endpoint caller) 
 authority: '0x251ae...05' (account addr. designated to sign transactions for this contract on behalf of caller)
 contractAddress: '0x821af...05' (address of deployed contract).
 }
 @method getContract 
 @returns {Promise} Resolves contract event record
 @returns {Promise} Rejects with hex code: NO_TX_DB_ERR or NO_TX_ADDR_ERR
*/
const getContract = exports.getContract = function(pin, signed){

    let res = {};
    let address = recover(pin, signed);

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
 @returns {Promise} Resolves hash string of pending AuthTx
 @returns {Promise} Rejects w/ hex code: NO_TX_FOUND
*/
const authTx = exports.authTx = function(pin, signed){

    let instance, hash;
    let animistContract = web3.eth.contract(config.abi);
    let client = recover(pin, signed);   
    
    if (client){
        // Get contract address, compose instance & invoke verifyPresence
        return contracts.get(client)
            .then( doc => {
                instance = animistContract.at(doc.contractAddress);
                return instance.verifyPresence(client, Date.now(), {from: deviceAccount});
            })
            .catch(err => Promise.reject(codes.NO_TX_DB_ERR));
        
    } else return Promise.reject(codes.NO_TX_ADDR_ERR);
};

/**
 * Prints client-signed tx to blockchain. A wrapper for web3 sendRawTransaction.
 * @method sendTx 
 * @param {String} tx: a signed transaction
 * @returns {String} txHash of sendRawTransaction 
 */
const sendTx = exports.sendTx = function(tx){
    return web3.eth.sendRawTransaction(tx);
}

/**
 Waits for auth tx to be mined then sends tx. Updates client's contract record with auth status when 
 pending, successful, failed and saves signedTx transaction hash to record on success. 
 @method sendTxWhenAuthed
 @param {String} authTxHash: hash of pending presence verification tx sent by animist device 
 @param {String} signedTx: signed tx submittable w/ eth.sendRawTransaction
 @param {String} address: the client account address
 @param {Function} cb: optional callback for unit testing. 
*/
const sendTxWhenAuthed = exports.sendTxWhenAuthed = function( authTxHash, signedTx, address, cb ){
    
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

