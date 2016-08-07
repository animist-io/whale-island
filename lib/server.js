
// ********************  This must run in its own process. ************************** 

'use strict'

// ----------------------------------- Imports -----------------------------------------
// Local
let config = require('../lib/config');
const terminal = require('../lib/terminal');
const util = require('../lib/util');
const defs = require('../lib/characteristics');

// Bleno has to be mocked for Travis CI because bluetooth dependencies
// aren't whitelisted -> tests crash w/ a seg fault
const bleno = (!process.env.TRAVIS) ? require('bleno') : require('../test/mocks/bleno.js'); 


// ----------------------------  Bleno Event Handlers ----------------------------------

const onStateChange = function(state){
    if (state === 'poweredOn') {

        bleno.startAdvertising(config.endpointName, [this.service.uuid]);
        terminal.start(this);
    
    } else bleno.stopAdvertising();
}

const onAdvertisingStart = function(err){
             
    if (err) return;

    bleno.setServices([ this.service ]);
    setInterval(util.resetPin, config.PIN_RESET_INTERVAL);
    terminal.advertising();
};

// No idea wtf. Is this the rssi of the connected device?
// If so is there any relationship btw this reading and the
// beacon proximity reading on the phone? Issue #12. This
// is about whether we can independently verify proximity. 
const onRssiUpdate = function(){

}

// --------------------------- Class: Animist Server ----------------------------------

class AnimistServer {

    constructor() {

        // Config
        this.serviceId = config.serviceId;
        this.uuids = config.characteristicUUIDS;
        this.location = config.location;

        // Service
        this.service = new bleno.PrimaryService({
        
            uuid: config.serviceId,
            characteristics: [ 
                defs.callTxCharacteristic,
                defs.sendTxCharacteristic,
                defs.authTxCharacteristic,
                defs.authAndSendTxCharacteristic,
                defs.getBlockNumberCharacteristic,
                defs.getTxStatusCharacteristic,
                defs.getNewSessionIdCharacteristic,
                defs.getSubmittedTxHashCharacteristic,
                defs.getPinCharacteristic, 
                defs.getContractCharacteristic,
            ]
        });
    }

    // Launch server
    start() {
        bleno.on('stateChange', onStateChange.bind(this));
        bleno.on('advertisingStart', onAdvertisingStart.bind(this));
        bleno.on('rssiUpdate', onRssiUpdate.bind(this));
    }    
};

// Export
module.exports.AnimistServer = AnimistServer;

// Shell Command: 
// % node lib/server.js start
if (process.argv[2] === 'start'){
   new AnimistServer().start();
}


