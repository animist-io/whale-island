
//This must run in its own process. 

'use strict'

const bleno = require('bleno');
const rs = require('randomstring');
const util = require("ethereumjs-util");
const config = require('../lib/config');

// ------------------ Config Constants -----------------------------

const codes = config.codes;
const PIN_RESET_INTERVAL = config.PIN_RESET_INTERVAL;

// --------------------- Locals ------------------------------------

let killHasTx;            // Bool: Continue/End has tx tranmission
let sendStack = [];       // Array of buffers repr. the tx to send
let pin = rs.generate();  // Published random string, changes ~30 sec
let lastPin = pin;        // Prev pin, kept in case a req overlaps change.

// -------------------  Utilities ----------------------------------

// recoverAddress (Source: eth-lightwallet)
const recoverAddress = function (rawMsg, signed) {
    let msgHash = util.sha3(rawMsg);
    let pub = util.pubToAddress(util.ecrecover(msgHash, signed.v, signed.r, signed.s));
    return pub.toString('hex');
};

// stackTx(tx): Converts a tx object into an array of buffers whose 
// largest size is MAX_SEND - e.g. the maximum number of bytes
// that can be sent in a packet. 
const stackTx = exports.stackTx = function(tx){

    var trans_size, start, end;
    var out = new Buffer(tx);

    start = end = 0;
    trans_size = config.MAX_SEND;

    sendStack = [];

    for (let i = 0; i < out.length; i += trans_size){
        
        ((out.length - start) < trans_size) ?
            end = start + (out.length - start) :
            end = end + trans_size;
      
        if (start != end){
            sendStack.push(out.slice(start, end));
            start = end;
        }
    }
};

// resetPin(): Generates a new pin. Keeps track of old pin temporarily.
const resetPin = exports.resetPin = function(){
    lastPin = pin;
    pin = rs.generate();
}

// parseHasTxRequest(): Validates format of a hasTx request. Expects
// data to be an object with key: "signed" that is a JSON formatted string
// representing the broadcast pin signed by the clients public key.
const parseHasTxRequest = exports.parseHasTxRequest = function(data){

    var parsed, address;

    try {
        // Check JSON formatting
        parsed = JSON.parse(data);

        // Check signed message
        if (!parsed.hasOwnProperty('r') ||
            !parsed.hasOwnProperty('s') ||
            !parsed.hasOwnProperty('v')) {
         
            return { status: 0, val: codes.NO_SIGNED_MSG_IN_REQUEST }

        // Explicitly recast r, s as buffers & return parsed value
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

const display = function(msg){ console.log(msg) };


// ---------------------- Characteristic Handlers -----------------------

// onPinRead()
const onPinRead = exports.onPinRead = function(offset, callback ){
   callback(codes.RESULT_SUCCESS, new Buffer(pin));
};

// onHasTxWrite()
const onHasTxWrite = exports.onHasTxWrite = function(data, offset, response, callback ){

   let address, address_old, signed, res, tx;
   let req = parseHasTxRequest(data);

   if (req.status){

      // Recover address from signed pin
      address = recoverAddress(pin, req.val);
      tx = getTx(address);

      // Pin updates frequently and transaction may be on this seam, so try 
      // with address derived from old pin
      if (!tx){

         address = recoverAddress(lastPin, req.val);
         tx = getTx(address);
      }

      // Success: confirm write, then send tx across after 50ms
      if (tx){

         killHasTx = false;
         callback(codes.RESULT_SUCCESS);
         stackTx(tx);
    
         setTimeout( () => {
            hasTxCharacteristic.updateValueCallback(sendStack.shift());
         }, 50);
         
      } else callback(codes.NO_TX_FOUND)
   
   } else callback(req.val);

};

// onHasTxIndicate: Runs updateValueCallback in a timeout per:
// https://github.com/sandeepmistry/bleno/issues/170
const onHasTxIndicate = exports.onHasTxIndicate = function(){

   var eof;

   if (!killHasTx) {
      
      if (sendStack.length){
         console.log("writing sendStack section");
         setTimeout(() => {
            hasTxCharacteristic.updateValueCallback(sendStack.shift());
         }, 0)
         
      } else {
         console.log("writing EOF");
         eof = new Buffer(codes.EOF);
         killHasTx = true;
         setTimeout(() => {
            hasTxCharacteristic.updateValueCallback(eof);
         }, 0)
      }

   } else {
      console.log("Returning on killHasTx");
      return;
   }
};

const onAuthTx = exports.onAuthTx = function(data, offset, response, callback){
   /*
   validate pin
   getTx
   */
};

const onSignTx = exports.onSignTx = function(data, offset, response, callback){

}

// -------------- Characteristic Defs ----------------------
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

// FAKE:
const getTx = module.exports.getTx = function(address){

    let fakeTx = config.fakeTx;
    return (fakeTx.authority === address ) ? JSON.stringify(fakeTx) : null;   
}

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

        // Handlers

    }
    start() {

        const msg = 
            `AnimistServer starting. . . 
             service: ${this.serviceId}
             location: lat: ${this.location.lat}, lng: ${this.location.lng}
             connnected: 
             `;


        bleno.on('stateChange', (state) => {
           if (state === 'poweredOn') {
              display(msg);
              bleno.startAdvertising(config.endpointName, [this.service.uuid], (err) => {
                 if (err) { display(err) }
              });
           }
           else {
              bleno.stopAdvertising();
           }
        });

        // Once we're on, start resetting pin . . .
        bleno.on('advertisingStart', (err) => {
           if (!err) { 
              bleno.setServices([ this.service ]);
              setInterval(resetPin, 30000);
              display('advertising . . .')
           }
        });
    }
    // Make some of the local data readable
    getPin() { return pin  }
    getLastPin() {return lastPin }
    getSendStack() { return sendStack }
    resetSendStack() { sendStack = [] }


};

// Export
module.exports.AnimistServer = AnimistServer;

// Shell Command: 
// % node lib/auth-beacon.js start
if (process.argv[2] === 'start'){
   new AnimistServer().start();
}


