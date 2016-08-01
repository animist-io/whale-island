
// ********  This must run in its own process. ************ 

'use strict'

// ----------------------------------- Imports -----------------------------------------
// Local
let config = require('../lib/config');
const terminal = require('../lib/terminal');
const eth = require('../lib/eth');

// Ethereum
const util = require("ethereumjs-util");
const Transaction = require('ethereumjs-tx');

// Misc NPM
const pouchdb = require('pouchdb');
const Promise = require('bluebird');
const rs = require('randomstring');

// Bleno has to be mocked for Travis CI because bluetooth dependencies
// aren't whitelisted -> tests crash w/ a seg fault
const bleno = (!process.env.TRAVIS) ? require('bleno') : require('../test/mocks/bleno.js'); 

// ----------------------------------- DB ----------------------------------------------

let sessions = (!process.env.TRAVIS) ? 
    new pouchdb('http://localhost:5984/sessions') :  
    new pouchdb('sessions');

// ----------------------------------- Constants ---------------------------------------

const codes = config.codes;
const TX_HASH_LENGTH = 0x42; // The Dalles number.

// ----------------------------------- Locals ------------------------------------------

/**
 @var {bool} killQueue: flag to continue/finish getContract tranmission 
 @var {Array} sendQueue: Array of type Buffer repr the contract to send
 @var {String} pin: ublished random string, changes ~30 sec
 @var {String} lastPin: prev pin, kept in case a req overlaps change.
*/
let killQueue;      
let sendQueue = [];       
let pin = rs.generate();  
let lastPin = pin;        

// ----------------------------------- Utilities ---------------------------------------

// Convenience methods for unit tests
const getPin = function() { return pin  };
const getLastPin = function() {return lastPin }
const getSendQueue =  function() { return sendQueue }
const resetSendQueue = function() { sendQueue = [] }
const setDB = function(db){ sessions = db }
const setSessionLength = function(length){ config.SESSION_LENGTH = length }

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

/** 
 Generates a new pin. Keeps track of old pin until next reset.
 @method resetPin 
*/
const resetPin = function(){
    lastPin = pin;
    pin = rs.generate();
}

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
    
    } catch (err) { return null }
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
        if (parsed.hasOwnProperty('r') && parsed.hasOwnProperty('s') && parsed.hasOwnProperty('v')) {

            parsed.r = new Buffer(parsed.r.data);
            parsed.s = new Buffer(parsed.s.data);
            return {ok: true, val: parsed }
        
        // Check for web3 signing format
        } else if ( typeof parsed === 'string' && util.isHexPrefixed(parsed) ){
            return { ok: true, val: parsed }
        
        // Failed
        } else return { ok: false, val: codes.NO_SIGNED_MSG_IN_REQUEST }

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
 Verifies that input has minimum formal properties of tx hash
 @method parseTxHash
 @returns {Object} parsed: { ok: boolean status, val: txHash string or hex error code  }
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
 Generates & saves session id record. Session id is required to submit an arbitrary tx
 and is used to prevent clients from publishing txs that need endpoint auth non-atomically.
 Session gets deleted after config.SESSION_LENGTH. 
 @method startSession
 @param {Object} tx: Should contain at least a caller field. May be a contract event object.
 @returns {Promise} tx object updates w/ fields, sessionId: string, expires: int, account: string
 @returns {Promise} hex error code
*/
const startSession = function(tx){
    
    tx.sessionId = rs.generate(10);
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
                (session.account === tx.account )
                    ? resolve()
                    : reject()

            }).catch(reject);
        }); 

    } else return Promise.reject();
}


// ---------------------- Characteristic Handlers -------------------------

/**
 Publishes current time pin value on read requests to pin characteristic
 @listens {Characteristic} Read: C40C94B3-D9FF-45A0-9A37-032D72E423A9
 @method onGetPin
 @returns {Buffer} pin: 32 character alpha-numeric string (resets every ~30 sec)
*/ 
const onGetPin = function(offset, callback ){
   callback(codes.RESULT_SUCCESS, new Buffer(pin));
};

/**
 Publishes current blockNumber on read requests to blockNumber characteristic
 @listens {Characteristic} Read: C888866C-3499-4B80-B145-E1A61620F885
 @method onGetBlockNumber
 @returns {Buffer} blockNumber: JSON string repr. int value converted to string.
*/ 
const onGetBlockNumber = function(offset, callback){
    let block = JSON.stringify(eth.getBlockNumber());
    callback(codes.RESULT_SUCCESS, new Buffer(block));
}

/**
 Responds w/ some web3 data about a tx. No pin signing is required to access this endpoint. 
 @method onGetTxStatus
 @listens {Characteristic} Subscribe/write to: 03796948-4475-4E6F-812E-18807B28A84A
 @param {String} data: hex prefixed tx hash
 @returns {Number} code: initial response is hex code callback. 0x00 on success or hex error code.
 @returns {Buffer} status: JSON object (or 'null' string) { blockNumber: int OR null, nonce: int, gas: int }
*/
const onGetTxStatus = function(data, offset, response, callback){
    let out; 
    let self = getTxStatusCharacteristic;
    let req = parseTxHash(data);
    
    if (req.ok){

        callback(codes.RESULT_SUCCESS);
        
        eth.getTx(req.val)
            .then( tx => { 
                out = new Buffer(JSON.stringify(tx));
                setTimeout(() => self.updateValueCallback(out), 50); 
            })
            .catch( err => {
                out = new Buffer(JSON.stringify('null'));
                setTimeout(() => self.updateValueCallback(out), 50);  
            });         
    } else callback(req.val); 
}

/**
 Generates, saves and sends a new session id. ( ID is required to access the submitTx endpoint.)
 @method onGetNewSessionId
 @listens {Characteristic} Subscribe/write to: 9BBA5055-57CA-4F78-BA61-52F4154382CF
 @param {String} signedPin: current endpoint pin value, signed by caller account.
 @returns {Number} code: initial response is hex code callback. 0x00 on success or hex error code.
 @returns {Buffer} session: JSON object (or 'null' string) { sessionId: string, expires: int, account: address }
*/
const onGetNewSessionId = function(data, offset, response, callback ){

    let out; 
    let self = getNewSessionIdCharacteristic;
    let req = parseSignedPin(data);
    
    if (req.ok){

        callback(codes.RESULT_SUCCESS);
        
        startSession({account: req.val})
            .then( session => { 
                out = new Buffer(JSON.stringify(session));
                setTimeout(() => self.updateValueCallback(out), 50); 
            })
            .catch( err => {
                out = new Buffer(JSON.stringify('null'));
                setTimeout(() => self.updateValueCallback(out), 50);  
            });         
    } else callback(req.val);    
}

/**
 Sends the transaction hash of the submitted tx from an atomic authAndSubmit 
 request. This is made available once the submittedTx has been mined. Also returns authStatus
 data which may be 'pending'  
 @method onGetSubmittedTxHash
 @listens {Characteristic} Subscribe/write to: 421522D1-C7EE-494C-A1E4-029BBE644E8D
 @param {String} signedPin: current endpoint pin value, signed by caller account.
 @returns {Number} code: initial response is hex code callback. 0x00 on success or hex error code.
 @returns {Buffer} txHash: JSON string, hash or 'null' on error 
*/ 
const onGetSubmittedTxHash = function(data, offset, response, callback){
    
    let client, out = {};   
    let self = getSubmittedTxHashCharacteristic;
    let req = parseSignedPin(data);

    if (req.ok){

        callback(codes.RESULT_SUCCESS);
        client = eth.recover(pin, req.val);
        eth.db().get(client)
            .then( doc => {
                out.authStatus = doc.authStatus;
                out.authTxHash = doc.authTxHash;
                out.submittedTxHash = doc.submittedTxHash;
                out = new Buffer(JSON.stringify(out)); 
                setTimeout(() => self.updateValueCallback(out), 50);
            })
            .catch( err => {
                out = new Buffer(JSON.stringify('null'));
                setTimeout( () => self.updateValueCallback(out), 50); 
            });

    } else callback(req.val); 
}


/**
 Fetches contract to which caller account is a party. Sends the contract code plus a 
 session id / expiration in a series of packets. This fn sends the first of these - 
 onGetContractIndicate sends the rest as the client signals it can accept more.   
 @method onGetContract
 @listens {Characteristic} Subscribe/write to: BFA15C55-ED8F-47B4-BD6A-31280E98C7BA
 @param {String} signedPin: current endpoint pin value, signed by caller account.
 @returns {Number} code: initial response is hex code callback. 0x00 on success or hex error code.
 @returns {Buffer} data: JSON object (or null string) contract data incl. code, session data.
*/ 
const onGetContractWrite = function(data, offset, response, callback ){

    let out;
    let req = parseSignedPin(data);

    if (req.ok){

        eth.getContract([pin, lastPin], req.val)
            .then(startSession)
            .then( contract => {

                killQueue = false;
                queueContract(contract);
                callback(codes.RESULT_SUCCESS);

                setTimeout(()=>{ 
                    out = sendQueue.shift();
                    getContractCharacteristic.updateValueCallback(out);
                }, 50);
            })
            .catch( error => { callback( error ) });     
    } else callback(req.val);               
};

/**
 Fetches contract referencing the caller account. Writes the contract code plus a session id / expiration 
 out to the client in a series of packets. This fn sends the first of these - onGetContractIndicate 
 sends the rest as the client signals it can accept more.   
 @method onGetContractIndicate
 @returns {Buffer} data: part of a JSONed contract object sitting in send queue. (see onGetContract)
 @returns {Buffer} eof: JSON string EOF after last packet is sent.
*/ 
const onGetContractIndicate = function(){
    // Uses a timeout per bleno/issues/170
    let out;
    let self = getContractCharacteristic;
    let eof = new Buffer(codes.EOF);

    if (!killQueue) {

        if (sendQueue.length){
            out = sendQueue.shift();
            setTimeout( () => self.updateValueCallback(out));
         
        } else {
            killQueue = true;
            setTimeout( () => self.updateValueCallback(eof));
        }

    // Post EOF
    } else return;
};

// onSignTx: Input is an eth-lightwallet signed method call, a signedPin and
// a sessionID. If these validate (see eth.signTx) it prints the tx to the chain and 
// responds with a tx hash. Responds with error code if web3 throws an error. This endpoint
// is a convenience for processing random method calls and payments. It cannot be used for 
// presence verification in combination with a separate call to authTx. Auth's must be done
// atomically using the authAndSubmit endpoint. 
// (Question: how much data can be handled by this call?)
const onSubmitTx = function(data, offset, response, callback){
    // WRITE FOURTH NEXT
}

/**
 Locates contract referencing the calling account and auths it ( e.g. prints a timestamped
 verification of callers presence to contract - see eth.authTx ). Responds w/ auth tx hash.   
 @method onAuthTx
 @listens {Characteristic} Subscribe/write to: 297E3B0A-F353-4531-9D44-3686CC8C4036
 @param {String} pin: current endpoint pin value, signed by caller account.
 @returns {Number} code: initial response is hex code callback. 0x00 on success or hex error code.
 @returns {Buffer} authTxHash: JSON string (or 'null' on error) transaction hash.
*/ 
const onAuthTx = function(data, offset, response, callback){
    
    let out;
    let self = authTxCharacteristic;
    let parsedPin = parseSignedPin(data);
    
    if (parsedPin.ok){

        callback(codes.RESULT_SUCCESS);
        eth.authTx( [pin, lastPin], parsedPin.val )
            .then( txHash => {
                out = new Buffer(JSON.stringify(txHash));
                setTimeout( () => self.updateValueCallback(out), 50);   
            })
            .catch( err => { 
                out = new Buffer(JSON.stringify('null'));
                setTimeout( () => self.updateValueCallback(out), 50); 
            });

    } else callback(parsedPin.val);      
};

/**
 Gets contract, auths and passes signed tx and the auth hash to submitTxWhenAuthed. 
 Sends auth transaction receipt. 
 @listens {Characteristic} Subscribe/write to: 8D8577B9-E2F0-4750-BB82-421750D9BF86
 @param {object} data: JSON object { pin: signedPin, tx: signed functionTx }
 @returns {Number} code: initial response is hex code callback. 0x00 on success or hex error code.
 @returns {Buffer} authTxHash: JSON string (or 'null' on error) transaction hash.
*/ 
const onAuthAndSubmitTx = function(data, offset, response, callback ){
    let out, client, parsedPin, parsedTx, signedPin, signedTx;
    let self = authAndSubmitTxCharacteristic;

    parsedPin = parseSignedPin(data);
    client = eth.recover(pin, parsedPin.val);
    parsedTx = parseSignedTx(data, client );

    if (parsedPin.ok && parsedTx.ok){
        signedPin = parsedPin.val;
        signedTx = parsedTx.val;

        callback(codes.RESULT_SUCCESS);
        eth.authTx( [pin, lastPin], signedPin )
            .then( authTxHash => {
                eth.submitTxWhenAuthed(authTxHash, signedTx, client );
                out = new Buffer(JSON.stringify(authTxHash));
                setTimeout( () => self.updateValueCallback(out), 50);   
            })
            .catch( err => { 
                out = new Buffer(JSON.stringify('null'));
                setTimeout( () => self.updateValueCallback(out), 50); 
            });

    } else {
        (parsedPin.ok) 
            ? callback( parsedTx.val )
            : callback( parsedPin.val ) 
    }
}



// Void indicators:
const onAuthTxIndicate = function(){};
const onAuthAndSubmitTxIndicate = function(){};
const onSubmitTxIndicate = function(){};
const onGetTxStatusSubscribe = function( max, fn ){};
const onGetSubmittedTxHashIndicate = function(){};
const onGetNewSessionIdIndicate = function(){};

// ----------------  Characteristic Defs ---------------------------

const authTxCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.authTx,
   properties: ['write', 'indicate'], 
   onWriteRequest: onAuthTx,
   onIndicate: onAuthTxIndicate

});

const authAndSubmitTxCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.authAndSubmitTx,
   properties: ['write', 'indicate'], 
   onWriteRequest: onAuthAndSubmitTx,
   onIndicate: onAuthAndSubmitTxIndicate
});

const submitTxCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.submitTx,
   properties: ['write', 'indicate'], 
   onWriteRequest: onSubmitTx,
   onIndicate: onSubmitTxIndicate
});

const getPinCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.getPin,
   properties: ['read'], 
   onReadRequest: onGetPin
});

const getBlockNumberCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.getBlockNumber,
   properties: ['read'], 
   onReadRequest: onGetBlockNumber
});

const getTxStatusCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.getTxStatus,
   properties: ['notify', 'write'], 
   onWriteRequest: onGetTxStatus,
   onSubscribe: onGetTxStatusSubscribe
});

const getNewSessionIdCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.getNewSessionId,
   properties: ['write', 'indicate'], 
   onWriteRequest: onGetNewSessionId,
   onIndicate: onGetNewSessionIdIndicate
});

const getContractCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.getContract,
   properties: ['write', 'indicate'], 
   onWriteRequest: onGetContractWrite,
   onIndicate: onGetContractIndicate
});

const getSubmittedTxHashCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.getSubmittedTxHash,
   properties: ['write', 'indicate'], 
   onWriteRequest: onGetSubmittedTxHash,
   onIndicate: onGetSubmittedTxHashIndicate
});



// ----------------  Bleno Event Handlers ----------------------------
const onStateChange = function(state){
    if (state === 'poweredOn') {

        bleno.startAdvertising(config.endpointName, [this.service.uuid]);
        terminal.start(this);
    
    } else bleno.stopAdvertising();
}

const onAdvertisingStart = function(err){
             
    if (err) return;

    bleno.setServices([ this.service ]);
    setInterval(resetPin, config.PIN_RESET_INTERVAL);
    terminal.advertising();
};

// No idea wtf. Is this the rssi of the connected device?
// If so is there any relationship btw this reading and the
// beacon proximity reading on the phone? Issue #12. This
// is about whether we can independently verify proximity. 
const onRssiUpdate = function(){

}

// ----------------  Class: Animist Server ---------------------------

class AnimistServer {

    constructor() {

        // Config
        this.serviceId = config.serviceId;
        this.uuids = config.characteristicUUIDS;
        this.location = config.location;

        // Characteristic Def
        this.submitTxCharacteristic = submitTxCharacteristic;
        this.authTxCharacteristic = authTxCharacteristic;
        this.authAndSubmitTxCharacteristic = authAndSubmitTxCharacteristic;
        this.getBlockNumberCharacteristic = getBlockNumberCharacteristic;
        this.getTxStatusCharacteristic = getTxStatusCharacteristic;
        this.getNewSessionIdCharacteristic = getNewSessionIdCharacteristic;
        this.getSubmittedTxHashCharacteristic = getSubmittedTxHashCharacteristic;
        this.getPinCharacteristic = getPinCharacteristic;
        this.getContractCharacteristic = getContractCharacteristic;

        // Handlers
        this.onGetPin = onGetPin;
        this.onGetTxStatus = onGetTxStatus;
        this.onGetNewSessionId = onGetNewSessionId;
        this.onGetSubmittedTxHash = onGetSubmittedTxHash;
        this.onGetContractWrite = onGetContractWrite;
        this.onGetContractIndicate = onGetContractIndicate;
        this.onGetBlockNumber = onGetBlockNumber;
        this.onSignTx = onSubmitTx;
        this.onAuthTx = onAuthTx;
        this.onAuthAndSubmitTx = onAuthAndSubmitTx;

        
        // Utilities
        this.queueContract = queueContract;
        this.parseSignedTx = parseSignedTx;
        this.parseSignedPin = parseSignedPin;
        this.parseTxHash = parseTxHash;
        this.resetPin = resetPin;
        this.startSession = startSession;
        this.isValidSession = isValidSession;
        this.setDB = setDB;
        this.setSessionLength = setSessionLength;

        // Read/Set local data for unit tests 
        this.getPin = getPin; 
        this.getLastPin = getLastPin;
        this.getSendQueue = getSendQueue;
        this.resetSendQueue = resetSendQueue;

        // Service
        this.service = new bleno.PrimaryService({
        
            uuid: config.serviceId,
            characteristics: [ 
                this.submitTxCharacteristic,
                this.authTxCharacteristic,
                this.authAndSubmitTxCharacteristic,
                this.getBlockNumberCharacteristic,
                this.getTxStatusCharacteristic,
                this.getNewSessionIdCharacteristic,
                this.getSubmittedTxHashCharacteristic,
                this.getPinCharacteristic, 
                this.getContractCharacteristic,
            ]
        });

        // Bleno Event Handlers
        this.onStateChange = onStateChange;
        this.onAdvertisingStart = onAdvertisingStart;
        this.onRssiUpdate = onRssiUpdate;
    }

    // Launch bleno
    start() {
        bleno.on('stateChange', onStateChange.bind(this));
        bleno.on('advertisingStart', onAdvertisingStart.bind(this));
        bleno.on('rssiUpdate', onRssiUpdate.bind(this));
    }    
};

// Export
module.exports.AnimistServer = AnimistServer;

// Shell Command: 
// % node lib/server.js start
if (process.argv[2] === 'start'){
   new AnimistServer().start();
}


