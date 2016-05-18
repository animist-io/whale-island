/* 
@file: identity-beacon.js

Effectively the 'main' for this module, it must run in its own nodejs process. It does the following:

a) broadcasts an ibeacon signal representing the identity of the whale-island instance
b) maintains an open socket with the auth-beacon broadcasting on the same whale from a different dongle
c) maintains an open socket with a wolves server that lets it receive messages from a mobile client
d) pings a wolves server to let it know its status on connection and disconnection
e) accesses a database of contracts to determine if it should write to its geth node
f) publishes changes to the geth node and checks for errors.
g) . . . .

*/

"use strict"

const ble = require('bleno');
const io = require('socket.io');
const web3 = require('web3');
const uuid = require('node-uuid');

class IdentityBeacon {
   constructor() {

   }

   begin() {
      
   }
};

// Export
module.exports.IdentityBeacon = IdentityBeacon;

// Shell Command: 
// % node lib/auth-beacon.js start
if (process.argv[2] === 'start'){
   new IdentityBeacon().begin();
}