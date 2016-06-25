var bleno = require('bleno');
var randomstring = require('randomstring');
var lightwallet = require('eth-lightwallet');

/// TO DO:
//  For hasTx:  Write auth parser
//              Send signed tx response and decode on wowshuxkluh 
//  
//  Develop session key system. . . . key, expires . . .             
//  For authTx: See if it's possible to get a JSON object . . .
//  PouchDB on client to speed up loads
//  Terminate on BLE so we can start stop server for testing w/out
//  reloading everything . . .
// 


var Characteristic = bleno.Characteristic;

// Service properties
// Characteristic UUIDS
var UUID = {

      auth: 'E219B7F9-7BF3-4B03-8DB6-88D228922F40',
      pin : 'C40C94B3-D9FF-45A0-9A37-032D72E423A9',
      hasTx:  'BFA15C55-ED8F-47B4-BD6A-31280E98C7BA',
      authTx: '297E3B0A-F353-4531-9D44-3686CC8C4036',
      signTx : '3340BC2C-70AE-4E7A-BE24-8B2ED8E3ED06'
};

var codes = {
   INVALID_JSON_IN_REQUEST:   0x02,
   NO_SIGNED_MSG_IN_REQUEST:  0x03,
   NO_TX_FOUND:               0x04,
   RESULT_SUCCESS:            0x00,
   EOF :                      'EOF' 
};

var MAX_SEND = 128;

// Animist Beacon UUIDS (Keys) and their corresponding Peripheral UUIDS
var endpointMap = {

  "4F7C5946-87BB-4C50-8051-D503CEBA2F19" : "05DEE885-E723-438F-B733-409E4DBFA694",
  "D4FB5D93-B1EF-42CE-8C08-CF11685714EB" : "9BD991F7-0CB9-4FA7-A075-B3AB1B9CFAC8", 
  "98983597-F322-4DC3-A36C-72052BF6D612" : "774D64CA-91C9-4C3A-8DA3-221D9CF755E7",
  "8960D5AB-3CFA-46E8-ADE2-26A3FB462053" : "33A93F3C-9CAA-4D39-942A-6659AD039232",
  "458735FA-E270-4746-B73E-E0C88EA6BEE0" : "01EC8B5B-B7DB-4D65-949C-81F4FD808A1A"
};

var pin = randomstring.generate();
var oldPin = null;
var sendStack = [];
var killHasTx;

function resetPin(){
   oldPin = pin;
   pin = randomstring.generate();
}

var name = 'Animist';
var uuid = '05DEE885-E723-438F-B733-409E4DBFA694';


var onAuth = function(data, offset, response, callback){


}
var onPinRead = function(offset, callback ){

   console.log('onPinRead: ' + pin );
   callback(codes.RESULT_SUCCESS, new Buffer(pin));
};


var onHasTxWrite = function(data, offset, response, callback ){

   var address, address_old, signed, res;
   var req = checkHasTxRequest(data);

   if (req.status){

      signed = req.val.signed;

      // Recover address from signed pin
      address = lightwallet.signing.recoverAddress(pin, signed.v, signed.r, signed.s);
      address = address.toString('hex');
      
      // Try to find tx with address derived from current pin
      tx = getTx(address);

      // Pin updates every 30sec and transaction may be on this seam, so try 
      // with address derived from old pin
      if (!tx){

         address_old = lightwallet.signing.recoverAddress(oldPin, signed.v, signed.r, signed.s);
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

// Test this . . . .
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



var checkHasTxRequest = function(data){

   var parsed, address;

   try {
      // Check JSON formatting
      parsed = JSON.parse(data);

      // Check signed message
      if (!parsed.hasOwnProperty('signed') || 
               !parsed.signed.hasOwnProperty('r') ||
               !parsed.signed.hasOwnProperty('s') ||
               !parsed.signed.hasOwnProperty('v')) {
         
         return { status: 0, val: codes.NO_SIGNED_MSG_IN_REQUEST }

      // Explicitly recast r, s as buffers & return parsed value
      } else {
         parsed.signed.r = new Buffer(parsed.signed.r.data);
         parsed.signed.s = new Buffer(parsed.signed.s.data);
         return {status: 1, val: parsed }
      }
   
   // JSON formatting failure catch
   } catch (err){
      return {status: 0, val: codes.INVALID_JSON_IN_REQUEST }
   }
}

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

var pinCharacteristic = new bleno.Characteristic({
   
   uuid: 'C40C94B3-D9FF-45A0-9A37-032D72E423A9',
   properties: ['read'], 
   onReadRequest: onPinRead

});

var hasTxCharacteristic = new bleno.Characteristic({
   
   uuid: 'BFA15C55-ED8F-47B4-BD6A-31280E98C7BA',
   properties: ['write', 'indicate'], 
   onWriteRequest: onHasTxWrite,
   onIndicate: onHasTxIndicate

});

var signTxCharacteristic = new bleno.Characteristic({
   
   uuid: '3340BC2C-70AE-4E7A-BE24-8B2ED8E3ED06',
   properties: ['write', 'notify'], 
   //onWriteRequest: onWrite2

});

var authCharacteristic = new bleno.Characteristic({
   uuid: 'E219B7F9-7BF3-4B03-8DB6-88D228922F40',
   properties: ['write', 'notify'], 
});


var service = new bleno.PrimaryService({
        
   uuid: uuid,
   characteristics: [ 
      pinCharacteristic, 
      hasTxCharacteristic,
      signTxCharacteristic,
      authTxCharacteristic 
   ]

});


//
// Wait until the BLE radio powers on before attempting to advertise.
// If you don't have a BLE radio, then it will never power on!
//
bleno.on('stateChange', function(state) {
   if (state === 'poweredOn') {
      console.log('starting advertising');
      bleno.startAdvertising(name, [service.uuid], function(err) {
         if (err) { console.log(err) }
      });
   }
   else {
      bleno.stopAdvertising();
   }

});

bleno.on('advertisingStart', function(err) {
   if (!err) {
      console.log('advertising...');
      bleno.setServices([ service ]);
      
      // Reset pin every x seconds 
      setInterval(resetPin, 30000);
   }
});