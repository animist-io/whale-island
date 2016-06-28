/* 
@file: server.js
This must run in its own process. 
*/

'use strict'

const bleno = require('bleno');
const randomstring = require('randomstring');
const util = require("ethereumjs-util");
const config = require('animist.config');

const codes = config.codes,
const MAX_SEND = config.MAX_SEND;
const PIN_RESET_INTERVAL = config.PIN_RESET_INTERVAL;

// Utilities

// recoverAddress (Stolen from eth-lightwallet)
const recoverAddress = function (rawMsg, v, r, s) {

  let msgHash = util.sha3(rawMsg);
  return util.pubToAddress(util.ecrecover(msgHash, v, r, s));
};

// stackTx(tx): Converts a tx object into an array of buffers whose 
// largest size is MAX_SEND - e.g. the maximum number of bytes
// that can be sent in a packet.
var stackTx = function(tx){

   var trans_size, start, end;
   var out = new Buffer(tx);

   start = 0;
   trans_size = end = MAX_SEND;

   sendStack = [];

   for (var i = 0; i < out.length; i += trans_size){
      
      ((out.length - start) < trans_size) ?
         end = start + (out.length - start) :
         end = end + trans_size;
      
      if (start != end){
         sendStack.push(out.slice(start, end));
         start = end;
      }
   }
};

const display(msg){ console.log(msg) }


// Characteristic definitions
const pinCharacteristic = new bleno.Characteristic({

   uuid: uuids.pin,
   properties: ['read'], 
   onReadRequest: onPinRead

});

const hasTxCharacteristic = new bleno.Characteristic({

   uuid: uuids.hasTx,
   properties: ['write', 'indicate'], 
   onWriteRequest: onHasTxWrite,
   onIndicate: onHasTxIndicate

});

const signTxCharacteristic = new bleno.Characteristic({

   uuid: uuids.signTx,
   properties: ['write', 'notify'], 
   onWriteRequest: onSignTx

});

const authCharacteristic = new bleno.Characteristic({
   uuid: uuids.authTx,
   properties: ['write', 'notify'], 
   onWriteRequest: onAuthTx
});

// Locals
let killHasTx;
let sendStack = [];
let pin = lastPin = randomstring.generate();

// Characteristic Callbacks
const onPinRead = function(offset, callback ){
   callback(codes.RESULT_SUCCESS, new Buffer(pin));
};

var onHasTxWrite = function(data, offset, response, callback ){

   var address, address_old, signed, res;
   var req = checkHasTxRequest(data);

   if (req.status){

      signed = req.val.signed;

      // Recover address from signed pin
      address = recoverAddress(pin, signed.v, signed.r, signed.s);
      address = address.toString('hex');
      
      // Try to find tx with address derived from current pin
      tx = getTx(address);

      // Pin updates every 30sec and transaction may be on this seam, so try 
      // with address derived from old pin
      if (!tx){

         address_old = recoverAddress(oldPin, signed.v, signed.r, signed.s);
         address_old = address.toString('hex');
         tx = getTx(address_old);
      }

      // Success: confirm write, then send tx across after 50ms
      if (tx){

         killHasTx = false;
         callback(codes.RESULT_SUCCESS);
         stackTx(tx);

         setTimeout(function(){
            console.log("writing first sendStack section")
            hasTxCharacteristic.updateValueCallback(sendStack.shift());
         }, 50);
         
      } else {
         console.log('sending no tx')
         callback(codes.NO_TX_FOUND)
      }

   } else {
      console.log('sending parse failure: ' + req.val.toString())
      callback(req.val);
   }
};

// onHasTxIndicate: Runs updateValueCallback in a timeout per:
// https://github.com/sandeepmistry/bleno/issues/170
var onHasTxIndicate = function(){

   var eof;

   if (!killHasTx) {
      
      if (sendStack.length){
         console.log("writing sendStack section");
         setTimeout(function(){
            hasTxCharacteristic.updateValueCallback(sendStack.shift());
         }, 0)
         
      } else {
         console.log("writing EOF");
         eof = new Buffer(codes.EOF);
         killHasTx = true;
         setTimeout(function(){
            hasTxCharacteristic.updateValueCallback(eof);
         }, 0)
      }

   else {
      console.log("Returning on killHasTx");
      return;
   }
};

var onAuthTx = function(data, offset, response, callback){
   /*
   validate pin
   getTx
   */
};

var onSignTx = function(data, offset, response, callback){

}

// FAKE:
var getTx = function(address){

   var response = {
      code: '6060604052610381806100136000396000f30060606040526000357c0100000000000000000000000000000000000000000000000000000000900480630ff4c9161461006557806329507f731461008c5780637b8d56e3146100a5578063c41a360a146100be578063f207564e146100fb57610063565b005b610076600480359060200150610308565b6040518082815260200191505060405180910390f35b6100a36004803590602001803590602001506101b3565b005b6100bc60048035906020018035906020015061026e565b005b6100cf600480359060200150610336565b604051808273ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b61010c60048035906020015061010e565b005b60006000600050600083815260200190815260200160002060005060000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1614156101af57336000600050600083815260200190815260200160002060005060000160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908302179055505b5b50565b3373ffffffffffffffffffffffffffffffffffffffff166000600050600084815260200190815260200160002060005060000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16141561026957806000600050600084815260200190815260200160002060005060000160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908302179055505b5b5050565b3373ffffffffffffffffffffffffffffffffffffffff166000600050600084815260200190815260200160002060005060000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff161415610303578060006000506000848152602001908152602001600020600050600101600050819055505b5b5050565b600060006000506000838152602001908152602001600020600050600101600050549050610331565b919050565b60006000600050600083815260200190815260200160002060005060000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905061037c565b91905056',
      proximity: 'any',
      authority: address,
   };

   return JSON.stringify(response);
}

class AnimistServer {

    constructor() {

        this.serviceId = config.serviceId;
        this.uuids = config.characteristicUUIDS;
        this.location = config.location;
        
        this.service = new bleno.PrimaryService({
        
           uuid: serviceId,
           characteristics: [ 
              pinCharacteristic, 
              hasTxCharacteristic,
              signTxCharacteristic,
              authTxCharacteristic 
           ]
        });
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
              this.display(msg);
              bleno.startAdvertising(name, [this.service.uuid], (err) => {
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
              bleno.setServices([ service ]);
              setInterval(resetPin, 30000);
              this.display('advertising . . .')
           }
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


