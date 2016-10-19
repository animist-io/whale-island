 'use strict'


// TO DO: rewrite pin  . . . .
// ----------------------------------- Imports -----------------------------------------
// Local
let config = require('../lib/config');
const eth = require('../lib/eth');
const pgpkey = require('../pgp/keystore.json');

// Ethereum
const util = require("ethereumjs-util");
const Transaction = require('ethereumjs-tx');

// Misc NPM
const pouchdb = require('pouchdb');
const Promise = require('bluebird');
const rs = require('randomstring');
const openpgp = require('openpgp');
const eventsEmitter = require('events');

// ----------------------------------- DB ----------------------------------------------

let sessions = (!process.env.TRAVIS) ? 
    new pouchdb('http://localhost:5984/sessions') :  
    new pouchdb('sessions');

// ----------------------------------- Constants ---------------------------------------

const codes = config.codes;
const TX_HASH_LENGTH = 0x42; // The Dalles number.
const SESSION_ID_LENGTH = 10;

// ----------------------------------- Eventing ---------------------------------------
class emitter extends eventsEmitter {};
const emit = new emitter().emit;
// ----------------------------------- Locals ------------------------------------------

/**
 @var {bool} queueActive: flag to continue/finish getContract tranmission 
 @var {Array} sendQueue: Array of type Buffer repr the contract to send
 @var {String} pin: 32 char alph-numeric random string that must be signed to access certain endpoints.
 @var {bool} clearPin: If true, a connection w/ a pin request has timed-out & pin will be cleared.
 @var {String} privKey: If true, a connection w/ a pin request has timed-out & pin will be cleared.
 
*/
let queueActive;      
let sendQueue = [];       
let pin = null;
let clearPin = false; 
let privkey = null;
let pubkey = null;

// ------------------------------ Decrypt PGP Key ----------------------------------
privkey = pgpkey.privateKeyArmored;
privkey = openpgp.key.readArmored(privkey);
privkey.keys[0].decrypt(config.pgpPassphrase); // ****** DEVELOPMENT ONLY *************
privkey = privkey.keys[0];     

// ----------------------------------- PGP --------------------------------------------

/**
 * Decrypts encrypted PGP message
 * @param  {String} encrypted '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'
 * @return {Promise} Resolves a decrypted message or rejects.
 */
const decrypt = function(encrypted){

    let msg;

    try {
       msg = openpgp.message.readArmored(encrypted);
       return msg.decrypt(privkey).then( decrypted => { return decrypted.getText() });  
    } catch (err) {
        return Promise.reject();
    }
    
}

/**
 * Encrypts a plaintext message with whale-island's public key. (For Unit Testing decryption)
 * @param  {String} data      plain text
 * @param  {String} publicKey '-----BEGIN PGP PUBLIC KEY BLOCK ... END PGP PUBLIC KEY BLOCK-----'
 * @return {Promise} Resolve an encrypted string or rejects.        
 */
const encrypt = function(data ){
    let options;

    try {
        options = {
            data: data,
            publicKeys: openpgp.key.readArmored(config.publicKey).keys[0],
        };
        return openpgp.encrypt(options).then( cipher => { return cipher.data }); 

    } catch (err) {
        return Promise.reject();
    }    
}

// ----------------------------------- PIN --------------------------------------------
/**
 * PIN getter. Blockchain writes and presence verifications require the mobile client to
 * sign this value w/the account they're executing txs with. Pin is generated anew for 
 * each connection and all endpoints except this one automatically disconnect from the client
 * at the earliest opportunity. After getting the pin mobile clients must make another endpoint
 * call within config.PIN_RESET_INTERVAL or their session will timeout. 
 * The pin helps to mitigate risks from MITM attack vectors and provides a way for clients to prove 
 * their identity.
 * @method  getPin
 * @param {Boolean} generateNew If true, generates a new pin and sets a timeout to clear it.
 * @return {String} pin: A 32 character alpha-numeric *random* value. 
 */
const getPin = function( generateNew ){

    if ( generateNew ){
        pin = rs.generate(); 
        clearPin = true;  

        setTimeout(() => {
            if (clearPin) 
                resetPin();
        }, config.PIN_RESET_INTERVAL);

        return pin;
    
    // Keep connection alive
    } else {
        clearPin = false; 
        return pin;
    } 
};

/** 
 Generates a new pin. Keeps track of old pin until next reset.
 @method resetPin 
*/
const resetPin = function(){
    pin = null;
    clearPin = false;
}

// ----------------------------------- Packet Queue ---------------------------------------
/**
 * DeQueues a packet from the send queue. This data structure is used to transmit long 
 * messages like contract code which exceed that maximum msg length for BLE 
 * @method  deQueue
 * @return {Buffer} packet: Part of a queued messsage.
 */
const deQueue = function(){ return sendQueue.shift() }

/**
 * Gets number of packets remaining to send.
 * @method queueLength
 * @return {Number} length
 */
const queueLength = function(){ return sendQueue.length }

/**
 * Sets flag to begin multi-packet message send
 * @method  activateQueue
 */
const activateQueue = function(){ queueActive = true}

/**
 * Unset multi-packet message send flag 
 * @method  deactivateQueue
 */
const deactivateQueue = function(){ queueActive = false}
/**
 * Get queue state, boolean active OR inactive.
 * @queueActive description]
 * @return {Boolean} state
 */
const isQueueActive = function(){ return queueActive }

/**
 Converts a tx object into an array of buffers whose largest size is MAX_SEND 
 - e.g. the maximum number of bytes that can be sent in a packet.
 @method queueContract
 @param {Object} code: 
*/
const queueContract = function(tx){

    var trans_size, start, end, out;
    
    tx = JSON.stringify(tx);
    out = new Buffer(tx);

    start = end = 0;
    trans_size = config.MAX_SEND;

    sendQueue = [];

    for (let i = 0; i < out.length; i += trans_size){
        
        ((out.length - start) < trans_size) ?
            end = start + (out.length - start) :
            end = end + trans_size;
      
        if (start != end){
            sendQueue.push(out.slice(start, end));
            start = end;
        }
    }
};

// ----------------------------------- Parsers ---------------------------------------

/** 
 Retrieves pin from incoming data as string or eth-lightwallet object. 
 @method extractPinFromJSON
 @param {String} data: JSON formatted string or object 
 @return {(String|Object)} signedPin: returns null on error. 
*/
const extractPinFromJSON = function(data){

    try {
        let parsed = JSON.parse(data);
        
        // Case: data has form { pin: {object} or string, tx: {object} }
        if (parsed.hasOwnProperty('pin') && (typeof parsed.pin === 'string' || typeof parsed.pin === 'object' ))
            return parsed.pin;
        
        // Case: data is string or eth-lightwallet object
        else if (typeof parsed === 'string' || typeof parsed === 'object')
            return parsed;
        
        // Case: data unknown
        else return null; 
    
    } catch (err) { 
        return null 
    }
}

/**
 Validates format of signedPin (A check done before extracting address from it).
 @method parseSignedPin
 @param {String} data: JSON formatted signed string OR an object with v,r,s fields.
 @returns {Object} parsed:  { ok: boolean status, val: signed pin OR hex error code }
*/
const parseSignedPin = function(data){

    var parsed, address;
    parsed = extractPinFromJSON(data);

    if (parsed){

        // Check for & re-buffer eth-lightwallet signing format 
        if ( parsed.hasOwnProperty('r') && parsed.hasOwnProperty('s') && parsed.hasOwnProperty('v')) {
            parsed.r = new Buffer(parsed.r.data);
            parsed.s = new Buffer(parsed.s.data);
            return {ok: true, val: parsed }
        
        // Check for web3 signing format
        } else if ( typeof parsed === 'string' && util.isHexPrefixed(parsed) ){
            return { ok: true, val: parsed }
        
        // Failed
        } else {
            return { ok: false, val: codes.NO_SIGNED_MSG_IN_REQUEST } 
        }

    // JSON formatting failure catch
    } else return { ok: false, val: codes.INVALID_JSON_IN_REQUEST } 
}

/** 
 Checks that signed tx object is valid - i.e. that it was signed by the same sender
 that signed the pin, that the signature verifies and tx's gas limit is sufficient.
 @method parseSignedTx
 @param {String} data: JSON formatted signed transaction object
 @param {String} client: hex prefixed address extracted from pin signing
 @return {Object} parsed: {ok: boolean status, val: tx string or error code }
*/
const parseSignedTx = function(data, client){
    
    let parsed, decodedTx, txAddress;

    try {     
        parsed = JSON.parse(data);

        // Formatting error checks
        if (typeof client != 'string')
            return {ok: false, val: codes.INVALID_PIN }

        else if (typeof parsed != 'object' || !parsed.hasOwnProperty('tx') || typeof parsed.tx != 'string')
            return { ok: false, val: codes.INVALID_JSON_IN_REQUEST };

        decodedTx = util.rlp.decode(util.addHexPrefix(parsed.tx));
        decodedTx = new Transaction(decodedTx);
        txAddress = util.addHexPrefix(decodedTx.getSenderAddress().toString('hex'));
    
        // Content error checks
        if ( txAddress != client )
            return { ok: false, val: codes.INVALID_TX_SENDER_ADDRESS };
        
        else if ( !decodedTx.validate() )
            return { ok: false, val: codes.INSUFFICIENT_GAS };

        // OK
        else return { ok: true, val: parsed.tx}

    // Unknown parse failure.
    } catch( err ){ 
        return { ok: false, val: codes.INVALID_JSON_IN_REQUEST };
    }
};

/**
 Verifies that JSON input has minimum formal properties of tx hash and returns hash as string.
 @method parseTxHash
 @returns {Object} parsed: { ok: boolean status, val: txHash string OR hex error code  }
*/
const parseTxHash = function(data){
    let parsed;
    try {
        parsed = JSON.parse(data);
        return ( typeof parsed === 'string' && util.isHexPrefixed(parsed) && parsed.length === TX_HASH_LENGTH )
            ? { ok: true, val: parsed  } 
            : { ok: false, val: codes.INVALID_TX_HASH } 
    }
    catch (err){
        return { ok: false, val: codes.INVALID_TX_HASH }
    }
}

/**
 * Verifies that JSON input has minimum formal properties of a sessionId and returns id as string.
 * @method  parseSessionId
 * @param {object} data: JSON formatted object {id: sessionId string, tx: signedTx string }
 * @returns {object} parsed: {ok: boolean status, val: sessionId string OR hex error code}
 */
const parseSessionId = function(data){
    let parsed;
    try {
        parsed = JSON.parse(data);
        return ( typeof parsed.id === 'string' && parsed.id.length === SESSION_ID_LENGTH )
            ? { ok: true, val: parsed.id  } 
            : { ok: false, val: codes.INVALID_SESSION_ID } 
    }
    catch (err){
        return { ok: false, val: codes.INVALID_SESSION_ID }
    }
}

/** 
 * Parses call data string into object that can be given as param to web3.eth.call
 * @method parseCall
 * @param {String} data: JSON formatted string repr. array (len 2) of hex prefixed strings.
 * @returns {Object} { ok: true, val: {to: '0xee9..f', data: '0x34d..a'}
 * @returns {Object} { ok: false, val: 0x11 } on error
 */
const parseCall = function(data){

    let parsed, isHex = util.isHexPrefixed;

    try {
        parsed = JSON.parse(data);

        return ( typeof parsed === 'object' && isHex(parsed[0]) && isHex(parsed[1]) )
            ? { ok: true, val: {to: parsed[0], data: parsed[1] }  } 
            : { ok: false, val: codes.INVALID_CALL_DATA } 
    }
    catch (err){
        return { ok: false, val: codes.INVALID_CALL_DATA }
    }
}

/**
 * Parses call data string into object that can be given as param to web3.eth.call
 * @method parseAddress
 * @param {String} data: JSON formatted string account address (must be hex prefixed)
 * @returns {Object} { ok: true, val: '0xabc3..567' }
 * @returns {Object} { ok: false, val: 0x05 } on error
 */
const parseAddress = function(data){
    let parsed;

    try{
        parsed = JSON.parse(data);
        
        return ( typeof parsed === 'string' && util.isValidAddress(parsed))
                ? { ok: true, val: parsed }
                : { ok: false, val: codes.NO_TX_ADDR_ERR} 
    }
    catch (err){
        return { ok: false, val: codes.INVALID_JSON_IN_REQUEST }
    }
}

// ----------------------------------- Sessions ---------------------------------
/**
 Generates & saves session id record. Session id is required to Send an arbitrary tx
 and is used to prevent clients from publishing txs that need endpoint auth non-atomically.
 Session gets deleted after config.SESSION_LENGTH. 
 @method startSession
 @param {Object} tx: Should contain at least an "account" field. May be a contract event object.
 @returns {Promise} tx object updates w/ fields, sessionId: string, expires: int, account: string
 @returns {Promise} hex error code
*/
const startSession = function(tx){
    
    tx.sessionId = rs.generate(SESSION_ID_LENGTH);
    tx.expires = Date.now() + config.SESSION_LENGTH;

    return new Promise((resolve, reject) => {
        
        sessions.put({_id: tx.sessionId, expires: tx.expires, account: tx.account })
            .then( doc => {    
                setTimeout(()=>{ sessions.remove(doc.id, doc.rev)}, config.SESSION_LENGTH);
                resolve(tx);
            })
            .catch( error => { reject( codes.DB_ERROR ) });
    });       
}

/**
 Verifies session id still exists and was issued to caller.  
 @method: isValidSession: 
 @returns {Promise} Resolves if id is ok.
 @returns {Promise} Rejects otherwise.
*/
const isValidSession = function(id, tx){

    if (typeof id === 'string'){
        return new Promise((resolve, reject) => {
            sessions.get(id).then( session => {
                (session.account === tx.account)
                    ? resolve()
                    : reject()
            }).catch(reject);
        }); 
    } else return Promise.reject();
}

/**
 * Validates sessionId, guarantees that sessionId was issued to tx signer, rejects
 * tx submissions for clients who while an atomic AuthAndSend is in progress.
 * @param  {String} data: JSON formatted {id: string ID, tx: string signedTx }
 * @return {Promise} Resolves w/ {ok: true, val: string signedTx }      
 * @return {Promise} Rejects w/  {ok: false, val: hex error code }
 */
const canSendTx = function(data){

    let parsedId, parsedTx;
    return new Promise((resolve, reject) => {

        parsedId = parseSessionId(data);

        // Does sessionId parse ok?
        if(parsedId.ok){

            // Get session 
            sessions.get(parsedId.val).then( session => {
                
                // Does tx parse ok?
                parsedTx = parseSignedTx(data, session.account);
                if (parsedTx.ok){
                    
                    // Does client have outstanding auth requirement?
                    eth.db().get(session.account).then( doc => {
                        // Pending: Reject. Finished: Resolve.    
                        ( doc.verifyPresenceStatus === 'pending' )
                            ? reject({ ok: false, val: codes.TX_PENDING })
                            : resolve(parsedTx)

                    // Client Unknown: resolve            
                    }, err => resolve(parsedTx)) 
                    
                // Tx didn't parse: Reject.
                } else reject(parsedTx) 
            
            // Cant find session id: Reject       
            }, err => reject({ok: false, val: codes.SESSION_NOT_FOUND}))

        // SessionId didn't parse: reject
        } else reject(parsedId)   
    });
}



// ------------------------ Convenience Methods for Unit Tests --------------------------
const _units = {
    getSendQueue :  function() { return sendQueue },
    resetSendQueue : function() { sendQueue = [] },
    setDB : function(db){ sessions = db },
    setSessionLength : function(length){ config.SESSION_LENGTH = length },
    setPinResetInterval: function(length){ config.PIN_RESET_INTERVAL = length }
}

// ------------------------ Convenience Methods for Unit Tests --------------------------
module.exports = {
    decrypt: decrypt,
    encrypt: encrypt,
    emit: emit,
    getPin: getPin,
    resetPin: resetPin,
    deQueue: deQueue,
    queueLength: queueLength,
    activateQueue: activateQueue,
    deactivateQueue: deactivateQueue,
    isQueueActive: isQueueActive,
    queueContract: queueContract, 
    parseSignedPin: parseSignedPin,
    parseSessionId: parseSessionId,
    parseSignedTx: parseSignedTx,
    parseTxHash: parseTxHash,
    parseCall: parseCall,
    parseAddress: parseAddress,
    extractPinFromJSON: extractPinFromJSON,
    canSendTx: canSendTx,
    startSession: startSession,
    isValidSession: isValidSession,
    _units: _units
}

