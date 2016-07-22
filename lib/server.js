
// ********  This must run in its own process. ************ 

'use strict'

let config = require('../lib/config');

const rs = require('randomstring');
const terminal = require('../lib/terminal');
const eth = require('../lib/eth');
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

// --------------------- Locals ------------------------------------

let killHasTx;            // Bool: Continue/End hasTx tranmission
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

// parseHasTxRequest(): Validates format of a hasTx request. Expects
// data to be a JSON formatted string convertible to an object with v,r,s fields.
// Output should be the broadcast pin signed by the clients public key.
const parseHasTxRequest = function(data){

    var parsed, address;

    try {
        // Check JSON formatting
        parsed = JSON.parse(data);

        // Check signed message
        if (!parsed.hasOwnProperty('r') || !parsed.hasOwnProperty('s') || !parsed.hasOwnProperty('v')) {

            return { status: 0, val: codes.NO_SIGNED_MSG_IN_REQUEST }

        // Recast r, s as buffers & return parsed value
        } else {
            parsed.r = new Buffer(parsed.r.data);
            parsed.s = new Buffer(parsed.s.data);
            return {status: 1, val: parsed }
        }
   
    // JSON formatting failure catch
    } catch (err){
        return {status: 0, val: codes.INVALID_JSON_IN_REQUEST }
    }
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

// onPinRead(): Publishes current time pin value on read requests to pin characteristic
const onPinRead = function(offset, callback ){
   callback(codes.RESULT_SUCCESS, new Buffer(pin));
};


// **** SHOULD BE RENAMED TO HAS CONTRACT -- ALSO CHANGE ON WOWSHUXKLUH *****
// onHasTxWrite(): Input to this handler is the endpoints pin value, signed.
// Handler extracts account number, searches the events db for records about
// the account and writes the contract code plus a session id / expiration 
// out to the client in a series of packets. This fn only sends the first -
// hasTxIndicate sends the rest as the client signals it can accept more.  
const onHasTxWrite = function(data, offset, response, callback ){

    let out;
    let req = parseHasTxRequest(data);

    if (req.status){

        eth.getTx([pin, lastPin], req.val)
            .then(startSession)
            .then( tx => {

                killHasTx = false;
                queueTx(tx);
                callback(codes.RESULT_SUCCESS);

                setTimeout(()=>{ 
                    out = sendQueue.shift();
                    hasTxCharacteristic.updateValueCallback(out);
                }, 50);
                
            })
            .catch( error => { callback( error ) });
       
    } else callback(req.val);               

};

// **** SHOULD BE RENAMED TO HAS CONTRACT -- ALSO CHANGE ON WOWSHUXKLUH *****
// onHasTxIndicate: Dequeues and sends one packet per call.
// Sends EOF code when queue is empty. Returns without doing anything if EOF got sent. 
// Runs updateValueCallback in a timeout per bleno/issues/170
const onHasTxIndicate = function(){

    let out;
    let eof = new Buffer(codes.EOF);

    if (!killHasTx) {

        if (sendQueue.length){
            out = sendQueue.shift();
            setTimeout(() => { hasTxCharacteristic.updateValueCallback(out) });
         
        } else {
            killHasTx = true;
            setTimeout(() => { hasTxCharacteristic.updateValueCallback(eof) });
        }

    // Post EOF
    } else return;
};


const onAuthTx = function(data, offset, response, callback){
    
    let out;
    let req = parseHasTxRequest(data);

    if (req.status){

        eth.getTx([pin, lastPin], req.val)
            .then( eth.authTx )
            .then( txHash => {

                callback(codes.RESULT_SUCCESS);

                setTimeout(()=>{ 
                    hasTxCharacteristic.updateValueCallback(txHash);
                }, 50);
                
            })
            .catch( error => { callback(error) });
       
    } else callback(req.val);      
};

const onSignTx = function(data, offset, response, callback){

}

//const onGetTxStatus = function( // read . . . .){
    // search for the tx w/ web3.
//}



// ----------------  Characteristic Defs ---------------------------

const pinCharacteristic = new bleno.Characteristic({

   uuid: config.characteristicUUIDS.pin,
   properties: ['read'], 
   onReadRequest: onPinRead

});

const hasTxCharacteristic = new bleno.Characteristic({

   uuid: config.characteristicUUIDS.hasTx,
   properties: ['write', 'indicate'], 
   onWriteRequest: onHasTxWrite,
   onIndicate: onHasTxIndicate

});

const signTxCharacteristic = new bleno.Characteristic({

   uuid: config.characteristicUUIDS.signTx,
   properties: ['write', 'notify'], 
   onWriteRequest: onSignTx

});

const authTxCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.authTx,
   properties: ['write', 'notify'], 
   onWriteRequest: onAuthTx
});

// ----------------  Class: Animist Server ---------------------------

class AnimistServer {

    constructor() {

        // Config
        this.serviceId = config.serviceId;
        this.uuids = config.characteristicUUIDS;
        this.location = config.location;

        // Characteristic Def
        this.pinCharacteristic = pinCharacteristic;
        this.hasTxCharacteristic = hasTxCharacteristic;
        this.signTxCharacteristic = signTxCharacteristic;
        this.authTxCharacteristic = authTxCharacteristic;

        // Handlers
        this.onPinRead = onPinRead;
        this.onHasTxWrite = onHasTxWrite;
        this.onHasTxIndicate = onHasTxIndicate;
        this.onSignTx = onSignTx;
        this.onAuthTx = onAuthTx;
        
        // Utilities
        this.queueTx = queueTx;
        this.parseHasTxRequest = parseHasTxRequest;
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
                this.pinCharacteristic, 
                this.hasTxCharacteristic,
                this.signTxCharacteristic,
                this.authTxCharacteristic 
            ]
        });
    }

    // **** EXTRACT CONTENTS AND CALL BOUND TO THIS e.g ***** 
    // bleno.on('stateChange', stateChange.bind(this)) 
    // Launch bleno
    start() {

        bleno.on('stateChange', (state) => {
            
            if (state === 'poweredOn') {
        
                bleno.startAdvertising(config.endpointName, [this.service.uuid]);
                terminal.start(this);
            
            } else bleno.stopAdvertising();

        });

        bleno.on('advertisingStart', (err)=>{
            
            if (err) return;

            bleno.setServices([ this.service ]);
            setInterval(resetPin, config.PIN_RESET_INTERVAL);
            terminal.advertising();
        });

        bleno.on('rssiUpdate', (rssi) => {
            // handle this
            // how frequent is this? 
        });
    }    
};

// Export
module.exports.AnimistServer = AnimistServer;

// Shell Command: 
// % node lib/server.js start
if (process.argv[2] === 'start'){
   new AnimistServer().start();
}


