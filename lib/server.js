
// ********  This must run in its own process. ************ 

'use strict'

let config = require('../lib/config');

const rs = require('randomstring');
const terminal = require('../lib/terminal');
const eth = require('../lib/eth');
const util = require("ethereumjs-util");
const pouchdb = require('pouchdb');
const Promise = require('bluebird');

// Bleno has to be mocked for Travis CI because bluetooth dependencies
// aren't whitelisted -> tests crash w/ a seg fault
const bleno = (!process.env.TRAVIS) ? require('bleno') : require('../test/mocks/bleno.js'); 

// ----------------------- DB ----------------------------------------

let sessions = (!process.env.TRAVIS) ? 
    new pouchdb('http://localhost:5984/sessions') :  
    new pouchdb('sessions');

// ------------------- Constants -----------------------------------

const codes = config.codes;
const TX_HASH_LENGTH = 66; 

// --------------------- Locals ------------------------------------

let killGetContract;      // Bool: Continue/End getContract tranmission
let sendQueue = [];       // Array of buffers repr. the tx to send
let pin = rs.generate();  // Published random string, changes ~30 sec
let lastPin = pin;        // Prev pin, kept in case a req overlaps change.

// -------------------  Utilities ----------------------------------

// Convenience methods for unit tests
const getPin = function() { return pin  };
const getLastPin = function() {return lastPin }
const getSendQueue =  function() { return sendQueue }
const resetSendQueue = function() { sendQueue = [] }
const setDB = function(db){ sessions = db }
const setSessionLength = function(length){ config.SESSION_LENGTH = length }

// queueTx(tx): Converts a tx object into an array of buffers whose 
// largest size is MAX_SEND - e.g. the maximum number of bytes
// that can be sent in a packet. 
const queueTx = function(tx){

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

// resetPin(): Generates a new pin. Keeps track of old pin temporarily.
const resetPin = function(){
    lastPin = pin;
    pin = rs.generate();
}

// extractPinFromJSON: Some requests pass just the signed pin, some embed the pin in 
// an object with other data. This fn should return pin as string or eth-lightwallet object
// for either case. Returns null on error. 
const extractPinFromJSON = function(data){

    try {
        let parsed = JSON.parse(data);
        
        // Case: data is { pin: {object} or string, tx: {object} }
        if (parsed.hasOwnProperty('pin') && (typeof parsed.pin === 'string' || typeof parsed.pin === 'object' ))
            return parsed.pin;
        
        // Case: data is string or eth-lightwallet object
        else if (typeof parsed === 'string' || typeof parsed === 'object')
            return parsed;
        
        // Case: data unknown
        else return null; 
    
    } catch (err) { return null }
}

// extractPinFromJSON: Returns tx portion of object encoded in JSON string;
// Returns null if string not parse-able as JSON, not an object with a 'tx' key. 
const extractTxFromJSON = function(data){
    
    try {     
        let parsed = JSON.parse(data);
        return (typeof parsed === 'object' && parsed.hasOwnProperty('tx'))
                ? parsed.tx
                : null;

    } catch( err ){ return null }
};

// parseSignedPin(): Validates format of a getContract request. Expects
// data to be a JSON formatted string convertible to an object with v,r,s fields.
// Output should be the broadcast pin signed by the clients public key.
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

const parseSignedTx = function(data){
    // TO DO . . . .
}

// Generate & save session id. Associate with caller account address. 
// set timeout to delete. Resolves the tx updated with sessionId and expiration vals
const startSession = function(tx){
    
    tx.sessionId = rs.generate(10);
    tx.expires = Date.now() + config.SESSION_LENGTH;

    return new Promise((resolve, reject) => {
        
        sessions.put({_id: tx.sessionId, expires: tx.expires, account: tx.caller })
            .then( doc => {    
                setTimeout(()=>{ sessions.remove(doc.id, doc.rev)}, config.SESSION_LENGTH);
                resolve(tx);
            })
            .catch( error => { reject( codes.DB_ERROR ) });
    });       
}

// isValidSession: Verifies session id still exists and was issued to caller.  
// Returns promise. Resolves if id is ok, rejects otherwise.
const isValidSession = function(id, tx){

    if (typeof id === 'string'){

        return new Promise((resolve, reject) => {
            
            sessions.get(id).then( session => {
                (session.account === tx.caller )
                    ? resolve()
                    : reject()

            }).catch(reject);
        }); 

    } else return Promise.reject();
}


// ---------------------- Characteristic Handlers -------------------------

// onGetPin(): Publishes current time pin value on read requests to pin characteristic
const onGetPin = function(offset, callback ){
   callback(codes.RESULT_SUCCESS, new Buffer(pin));
};

// onGetPin(): Publishes current blockNumber on read requests to blockNumber characteristic
const onGetBlockNumber = function(offset, callback){
    let block = JSON.stringify(eth.getBlockNumber());
    callback(codes.RESULT_SUCCESS, new Buffer(block));
}

// onGetTx: Input is a hex prefixed tx hash.
// No pin signing is required to access this endpoint. 
// Checks that input is hex prefixed 32character string and responds 
// w/ some web3 data about the tx: { blockNumber: int || null, nonce: int, gas: int } 
// Responds with error code if tx not found or input malformed. 
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

// onGetNewSessionId: Input is the endpoints pin value, signed. Generates
// a new sessionID and returns it. This ID is required to access the submitTx
// endpoint. 
const onGetNewSessionId = function(data, offset, response, callback ){

    let out; 
    let self = getNewSessionIdCharacteristic;
    let req = parseSignedPin(data);
    
    if (req.ok){

        callback(codes.RESULT_SUCCESS);
        
        startSession({caller: req.val})
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


// onGetSubmittedTxHash: Input is the endpoints pin value, signed.
// Responds w/ the transaction hash of the submitted tx in an authAndSubmit 
// request from the contractsDB. This is available once the submittedTx has 
// been mined. 
const onGetSubmittedTxHash = function(data, offset, response, callback){
    // Write third next
}


// onGetContractWrite(): Input is the endpoints pin value, signed.
// Fetches contract referencing the caller account, whose number is extracted 
// from the signed pin. Writes the contract code plus a session id / expiration 
// out to the client in a series of packets. This fn only sends the first -
// getContractIndicate sends the rest as the client signals it can accept more.  
const onGetContractWrite = function(data, offset, response, callback ){

    let out;
    let req = parseSignedPin(data);

    if (req.ok){

        eth.getContract([pin, lastPin], req.val)
            .then(startSession)
            .then( tx => {

                killGetContract = false;
                queueTx(tx);
                callback(codes.RESULT_SUCCESS);

                setTimeout(()=>{ 
                    out = sendQueue.shift();
                    getContractCharacteristic.updateValueCallback(out);
                }, 50);
            })
            .catch( error => { callback( error ) });     
    } else callback(req.val);               
};

// onGetContractIndicate: Dequeues and sends one packet per call.
// Sends EOF code when queue is empty. Returns without doing anything if EOF got sent. 
// Runs updateValueCallback in a timeout per bleno/issues/170
const onGetContractIndicate = function(){

    let out;
    let eof = new Buffer(codes.EOF);

    if (!killGetContract) {

        if (sendQueue.length){
            out = sendQueue.shift();
            setTimeout(() => { getContractCharacteristic.updateValueCallback(out) });
         
        } else {
            killGetContract = true;
            setTimeout(() => { getContractCharacteristic.updateValueCallback(eof) });
        }

    // Post EOF
    } else return;
};

// onSignTx: Input is an eth-lightwallet signed method call, a signedPin and
// a sessionID. If these validate (see eth.signTx) it prints the tx to the chain and 
// responds with a tx hash. Responds with error code if web3 throws an error. This endpoint
// is a convenience for processing random method calls and payments. It cannot be used for 
// presence verification in combination with a separate call to authTx. Auth's must be done
// using the authAndSubmit endpoint. (Question: how much data can be handled by this call?)
const onSubmitTx = function(data, offset, response, callback){
    // WRITE FOURTH NEXT
}

// onAuthTx: Input is the endpoints pin value, signed. It locates
// contract referencing the calling account, auths it ( e.g. prints a timestamped
// verification of callers presence to contract - see eth.authTx ) and notifies w/ the 
// transaction hash of the verify. (Unknown: speed this happens at. Unit tests are pretty
// slow but < 1000ms ).  Notifies w/ 'null' if req is bad or contract can't
// be found.
const onAuthTx = function(data, offset, response, callback){
    
    let out
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

// authAndSubmitTx: Inputs are the endpoints pin value, signed AND an 
// eth-lightwallet signed method call. Gets contract, auths then waits
// for the auth to be mined and submits signed tx. Responds immediately w
// auth transaction receipt. Stores signedTx transaction hash in the 
// contractDB record when it is mined.
const onAuthAndSubmitTx = function(data, offset, response, callback ){
    let out
    let self = authAndSubmitTxCharacteristic;
    let parsedPin = parseSignedPin(data);
    let parsedTx = parseSignedTx(data);

    if (parsedPin.ok && parsedTx.ok){

        callback(codes.RESULT_SUCCESS);
        eth.authTx( [pin, lastPin], parsedPin.val )
            .then( txHash => {
                submitTxWhenAuthed(txHash, parsedTx.val, parsedPin.val );
                out = new Buffer(JSON.stringify(txHash));
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

const submitTxWhenAuthed = function( txHash, signedTx, clientAddress ){
    // getContract:
    //    save fields: authStatus: pending, txHash: null;

    // Set an interval where you getTx on the auth txHash.
    // It will be null, rejected, or passed. 
    // If null, continue;
    // If rejected 
    //    save fields: authStatus: failed
    // If passed submitTx
    //     save fields: authStatus: success txHash: hash 
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
        this.onGetContractWrite = onGetContractWrite;
        this.onGetContractIndicate = onGetContractIndicate;
        this.onGetBlockNumber = onGetBlockNumber;
        this.onSignTx = onSubmitTx;
        this.onAuthTx = onAuthTx;
        this.onAuthAndSubmitTx = onAuthAndSubmitTx;

        
        // Utilities
        this.queueTx = queueTx;
        this.parseSignedTx = parseSignedTx;
        this.parseSignedPin = parseSignedPin;
        this.parseTxHash = parseTxHash;
        this.resetPin = resetPin;
        this.startSession = startSession;
        this.isValidSession = isValidSession;
        this.setDB = setDB;
        this.setSessionLength = setSessionLength;
        this.submitTxWhenAuthed = submitTxWhenAuthed; 

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


