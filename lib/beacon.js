/**
Broadcasts an ibeacon signal representing the identity of the whale-island instance
*/

"use strict"

const bleno = (process.env.TRAVIS) ? require('../test/mocks/bleno.js') : require('bleno');

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