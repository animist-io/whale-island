/**
Broadcasts the ibeacon signal requested by client contract.
*/

"use strict"
// ----------------------------------- Imports -----------------------------------------
// Local
let config = require('../lib/config');
const terminal = require('../lib/terminal');

// NPM 
const bleno = require('bleno');
// ----------------------------  Bleno Event Handlers ----------------------------------

const onStateChange = function(state){
    if (state === 'poweredOn') {

        /*bleno.startAdvertisingIBeacon( 
            this.uuid, 
            this.major, 
            this.minor, 
            this.measuredPower
        );*/

    } else bleno.stopAdvertising();
}

const onAdvertisingError = function(err){
    terminal.beaconError(err);
}

const onAdvertisingStart = function(err){
    if (err) return;
    else     terminal.beacon(this);
}

class IdentityBeacon {

    constructor() {};

    start() {
        bleno.on('stateChange', onStateChange.bind(this));
        bleno.on('advertisingStart', onAdvertisingStart.bind(this));
        bleno.on('onAdvertisingError', onAdvertisingError.bind(this));
    }
};

// Export
module.exports.IdentityBeacon = IdentityBeacon;
module.exports.addBeacon = () => { return Promise.resolve() }; /* ---- STUB ------- */

// Shell Command: 
// % node lib/beacon.js start
if (process.argv[2] === 'start'){
        new IdentityBeacon().start();
}