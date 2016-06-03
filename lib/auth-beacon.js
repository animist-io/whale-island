/* 
@file: auth-beacon.js

This must run in its own process. It does the following:
a) broadcasts a periodically changing ibeacon signal representing the authorized identity of a whale-island instance
b) maintains an open socket with the identity-beacon broadcasting beacons on the same whale from a different dongle
c) publishes its current and previous value to the identity-beacon thread. 
*/

"use strict"

const ble = require('bleno');
const io = require('socket.io');
const uuid = require('node-uuid');

class AuthBeacon {
   constructor() {

   }
   begin() {

   }
   change(){

   }
};

// Export
module.exports.AuthBeacon = AuthBeacon;

// Shell Command: 
// % node lib/auth-beacon.js start
if (process.argv[2] === 'start'){
   new AuthBeacon().begin();
}


