/**
Broadcasts an ibeacon signal requested by client contract.
*/

"use strict"
// ----------------------------------- Imports -----------------------------------------
// Local
let config = require('../lib/config');
const terminal = require('../lib/terminal');

// NPM 
// Bleno:  Has to be mocked for Travis CI because bluetooth dependencies aren't whitelisted 
// const bleno = require('bleno');
const bleno = require('../test/mocks/bleno.js');


// ----------------------------  Bleno Event Handlers ----------------------------------

/**
 * Sets poweredOn flag (which must be true for a beacon to be added to queue )
 * @param  {String} state bleno state descriptor
 */
const onStateChange = function(state){
    if (state === 'poweredOn'){
        this.poweredOn = true;
    } else {
        this.poweredOn = false;
        bleno.stopAdvertising();
    }
}

/**
 * Prints error to terminal
 * @param  {String} err bleno error
 */
const onAdvertisingError = function(err){
    this.advertising = false;
    terminal.beaconError(err);
}

/**
 * Sets a timeout to stop advertising beacon after `config.beaconBroadcastInterval` ms.
 * If there is an error, tries to initiate next queued beacon transmission. 
 * @param  {String} err bleno error
 */
const onAdvertisingStart = function(err){
    (err)
        ? this.startAdvertisingNextBeacon()
        : setTimeout(() => bleno.stopAdvertising(), config.beaconBroadcastInterval );
}

/**
 * Initiates next queued beacon transmission.
 */
const onAdvertisingStop = function(){
    this.advertising = false;
    this.startAdvertisingNextBeacon();
}

// ----------------------------  Core Methods ----------------------------------

/**
 * Adds beacon to queue. If queue was empty, initiates beacon transmission.
 * @param {String} uuid  v4 uuid
 * @param {Number} major two byte integer
 * @param {Number} minor two byte integer
 */
const addBeacon = function(uuid, major, minor){
    
    if ( this.poweredOn ){
        this.beaconQueue.push({uuid: uuid, major: major, minor: minor});
        
        ( this.beaconQueue.length === 1 )
            ? this.startAdvertisingNextBeacon()
            : null
    }
}

/**
 * De-queues requested beacon data and starts advertising it
 */
const startAdvertisingNextBeacon = function(){
    
    let beacon;

    if (this.beaconQueue.length && !this.advertising ) {
        this.advertising = true;
        beacon = this.beaconQueue.shift();
        bleno.startAdvertisingIBeacon( 
            beacon.uuid, 
            beacon.major, 
            beacon.minor, 
            this.measuredPower
        );
    } 
}

// ----------------------- Class Def: Requestable Beacon  --------------------------
class RequestableBeacon {

    constructor() {
        this.poweredOn = false;
        this.advertising = false;
        this.measuredPower = config.measuredIBeaconPower;
        this.beaconQueue = [];
        this.addBeacon = addBeacon;
        this.startAdvertisingNextBeacon = startAdvertisingNextBeacon;
        this._units = {
            onStateChange: onStateChange.bind(this),
            onAdvertisingStart: onAdvertisingStart.bind(this),
            onAdvertisingStop: onAdvertisingStop.bind(this)
        }
    };

    start() {
        bleno.on('stateChange', onStateChange.bind(this));
        bleno.on('advertisingStart', onAdvertisingStart.bind(this));
        bleno.on('onAdvertisingError', onAdvertisingError.bind(this));
    }
};

// Export
module.exports.RequestableBeacon = RequestableBeacon;

// Exports for units
module.exports.addBeacon = () => { return Promise.resolve() }; /* ---- STUB ------- */
module.exports.getLocalBlenoInstance = () => bleno;
module.exports.setBeaconBroadcastInterval = (val) => config.beaconBroadcastInterval = val;

// Shell Command: 
// % node lib/beacon.js start
if (process.argv[2] === 'start'){
        new RequestableBeacon().start();
}