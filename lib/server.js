
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

// --------------------- DB ----------------------------------------

let sessions = (!process.env.TRAVIS) ? new pouchdb('http://localhost:5984/sessions') :  new pouchdb('sessions');

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

// Generate & save session id, set timeout to delete.
const startSession = function(tx){
    
    tx.sessionId = rs.generate(10);
    tx.expires = Date.now() + config.SESSION_LENGTH;

    return new Promise((resolve, reject) => {
        sessions.put({_id: tx.sessionId, expires: tx.expires}).then((doc)=>{
            
            setTimeout(()=>{
                sessions.remove(doc.id, doc.rev);
            }, config.SESSION_LENGTH);

            resolve(doc);
        
        }).catch(reject);
    });
        
}
   
const isValidSession = function(id){

    return (typeof id === 'string') ? 
        sessions.get(id) : 
        Promise.reject();
}


// ---------------------- Characteristic Handlers -------------------------

// onPinRead()
const onPinRead = function(offset, callback ){
   callback(codes.RESULT_SUCCESS, new Buffer(pin));
};

// onHasTxWrite()
const onHasTxWrite = function(data, offset, response, callback ){

    let address, address_old, signed, res, tx;
    let req = parseHasTxRequest(data);

    if (req.status){

        eth.getTx([pin, lastPin], req.val).then((tx) => { 
            startSession(tx).then(() => {
            
                killHasTx = false;
                queueTx(tx);
                setTimeout(()=>{ 
                    hasTxCharacteristic.updateValueCallback(sendQueue.shift());
                }, 50);

                callback(codes.RESULT_SUCCESS);
            
            }).catch(()=>{ callback(codes.DB_ERROR) })
        }).catch(()=>{ callback(codes.NO_TX_FOUND) });
       
    } else callback(req.val);               

};

// onHasTxIndicate: 
// Runs updateValueCallback in a timeout per bleno/issues/170
const onHasTxIndicate = function(){

    let eof;

    if (!killHasTx) {

        if (sendQueue.length){
            setTimeout(() => { 
                hasTxCharacteristic.updateValueCallback(sendQueue.shift());
            }, 0)
         
        } else {
            eof = new Buffer(codes.EOF);
            killHasTx = true;
            setTimeout(() => {
                hasTxCharacteristic.updateValueCallback(eof);
            }, 0)
        }

    // Post EOF
    } else return;
};

const onAuthTx = function(data, offset, response, callback){
  
   //validate pin
   //getTx
   
};

const onSignTx = function(data, offset, response, callback){

}

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
// % node lib/auth-beacon.js start
if (process.argv[2] === 'start'){
   new AnimistServer().start();
}


