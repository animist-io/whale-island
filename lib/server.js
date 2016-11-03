
// ********************  This must run in its own process. ************************** 

'use strict'

// ----------------------------------- Imports -----------------------------------------
// Local
let config = require('../lib/config');
const terminal = require('../lib/terminal');
const util = require('../lib/util');
const handlers = require('../lib/handlers');
const events = require('../lib/events');

// NPM
// Bleno has to be mocked for Travis CI because bluetooth dependencies
// aren't whitelisted -> tests crash w/ a seg fault

//let bleno = require('bleno');
let bleno = require('../test/mocks/bleno.js');

const pouchdb = require('pouchdb');
const upsert = require('pouchdb-upsert');
const _ = require('lodash/array'); 

// ------------------------------------ Databases  --------------------------------------
pouchdb.plugin(upsert);

let animistEvents = (!process.env.TRAVIS) 
                    ? new pouchdb('http://localhost:5984/animistEvents') 
                    : new pouchdb('animistEvents');


// ----------------------------  Characteristic Definitions -----------------------------
const defs = handlers.defs;
const defaultCharacteristics = [
    defs.getClientTxStatusCharacteristic, 
    defs.getDeviceAccountCharacteristic,
    defs.getAccountBalanceCharacteristic,
    defs.getContractCharacteristic,
    defs.getPinCharacteristic, 
    defs.callTxCharacteristic,
    defs.sendTxCharacteristic,
    defs.verifyPresenceCharacteristic,
    defs.verifyPresenceAndSendTxCharacteristic,
    defs.getBlockNumberCharacteristic,
    defs.getPgpKeyIdCharacteristic,
    defs.getTxStatusCharacteristic
];

// ----------------------------  Bleno Event Handlers ----------------------------------
const onStateChange = function(state){
    if (state === 'poweredOn') {

        bleno.startAdvertising(config.serverName, [this.service.uuid]);
        terminal.start(this);
    
    } else bleno.stopAdvertising();
}

const onAdvertisingStart = function(err){
           
    if (err) return;

    prepPublicationsOnLaunch().then( res => {
        updateBroadcast();
        events.startPresenceVerificationRequestsFilter( config.eventsContractAddress );
        events.startMessagePublicationRequestsFilter( config.eventsContractAddress, this.addPublication );
        terminal.advertising()
    })
};

const onDisconnect = function(clientAddress){
    util.resetPin();
}

// Question: Is this the rssi of the connected device?
// If so is there any relationship btw this reading and the
// beacon proximity reading on the phone? Issue #12. This
// is about whether we can independently verify proximity. 
const onRssiUpdate = function(){

}

// ----------------------------  Broadcasts  ----------------------------------

/**
 * Verifies that this uuid is NOT already being published.
 * @param  {String}  uuid v4 uuid formatted with dashes
 * @param  {Object}  args publication event args  
 * @return {Boolean} True if uuid is not already being published, false otherwise
 */
const isUniqueUUID = function(uuid, args){
    let compare = (obj) => obj.uuid === uuid;
    return (_.findIndex(args, compare) === -1)
}

/**
 * Goes through publications on startup to remove any that have expired while
 * node was down. Sets new timeouts to remove publications as they expire while
 * whale-island is powered on.
 * @returns {Promise} Result of pouchDB gets/puts
 */
const prepPublicationsOnLaunch = function(){

    let now = Date.now();

    return animistEvents.get('publications')
        .then( doc => {        
            _.remove(doc.list, item => now >= item.expires );
            doc.list.forEach( item => scheduleRemoval( item, item.expires - now));
            return animistEvents.put(doc);
        })
        .catch( err => {
            console.log(err);
            return Promise.resolve()
        });
};


/**
 * Updates the set of read characteristics to include a `uuid` which checks client authorization
 * to read message, responds with `message`, writes confirmation of read to client contract
 * and disconnects. Sets a timeout to remove characteristic after `duration`.
 * @param {Object}  args  `{ uuid: <string>, message: <string>, expires: <number>, contractAddress: <string> }` 
 * @return {Promise} Result of DB gets/puts.
 */
const addPublication = function( args ){
       
    let list = [];
    let duration = args.expires - Date.now();

    // Save to list of currently requested broadcasts and update broadcasts (if unique).
    return animistEvents.get('publications')
        .then( doc => {
            if (isUniqueUUID(args.uuid, doc.list)){
                doc.list.push(args);
                return animistEvents.put(doc).then( res => {
                    scheduleRemoval( args, duration );
                    this.updateBroadcast(); 
                });
            }
        })
        .catch( err => {
            list.push(args);
            return animistEvents.put({ _id: 'publications', list: list }).then( res => {
                scheduleRemoval( args, duration );
                this.updateBroadcast(); 
            });
        })
}

/**
 * Removes an expired publication and updates the current broadcast
 * @param  {Object} pub      `{ characteristic: <bleno object>, expires: <date ms> }`
 * @param  {Number} duration ms before removal
 */
const scheduleRemoval = function( pub, duration ){

    setTimeout( () => {
        
        if (!animistEvents) return;

        animistEvents.get('publications').then( doc => {
                _.remove(doc.list, item => item.uuid === pub.uuid );
                animistEvents.put(doc).then( updateBroadcast ) 
        })
    
    }, duration );
}

/**
 * Resets service to include a new publication
 */
const updateBroadcast = function(){

    // Probably need to check if were connected here in an interval. . . .

    let char, publications = [];
    let characteristics = defaultCharacteristics.slice();

    return animistEvents.get('publications')
        .then( doc => {
            publications = [];
            doc.list.forEach( item => {
                char = new bleno.Characteristic({ uuid: item.uuid, properties: ['write']});
                char.onWriteRequest = handlers.generatePublicationHandler(item, char); 
                publications.push(char);
            });

            characteristics.concat(publications);
            this.service.characteristics = characteristics;
            bleno.setServices([this.service]);
        })
        .catch( err => {
            this.service.characteristics = characteristics;
            bleno.setServices([this.service]);
        });
}

const testAddingServices = function(server){

    let uuid1 = new bleno.Characteristic({
       uuid: '9CCB0570-A4F6-4E98-AA15-F9E070EB105C',
       properties: ['read'], 
       onReadRequest: (offset, callback) => {
            callback(config.codes.RESULT_SUCCESS, new Buffer('uuid1'));
            bleno.disconnect();
       }
    });

    let uuid2 = new bleno.Characteristic({
       uuid: '9CCB0570-A4F6-4E98-AA15-F9E070EB105C',
       properties: ['read'], 
       onReadRequest: (offset, callback) => {
            callback(config.codes.RESULT_SUCCESS, new Buffer('uuid2'));
            bleno.disconnect();
       }
    });

    server.service.characteristics.push(uuid1);
    server.service.characteristics.push(uuid2);
    bleno.setServices([server.service]);
}

// Convenience methods for unit tests
const _units = exports._units = {
    setDB : db =>  animistEvents = db,
    getUpdateBroadcast: () => updateBroadcast,
}

// --------------------------- Class: Animist Server ----------------------------------

class AnimistServer {

    constructor() {

        this.defaultCharacteristics = defaultCharacteristics;

        // Service
        this.service = new bleno.PrimaryService({
            uuid: config.serverServiceId,
            characteristics: []
        });

        this.addPublication = addPublication;
        this.updateBroadcast = updateBroadcast;
    }

    // Set up listeners on launch
    start() {
        bleno.on('stateChange', onStateChange.bind(this));
        bleno.on('advertisingStart', onAdvertisingStart.bind(this));
        bleno.on('disconnect', onDisconnect.bind(this));
        bleno.on('rssiUpdate', onRssiUpdate.bind(this));
    }    
};

// Export
module.exports = {
    AnimistServer: AnimistServer,
    addPublication : addPublication,
    updateBroadcast : updateBroadcast,
    prepPublicationsOnLaunch : prepPublicationsOnLaunch,
    isUniqueUUID : isUniqueUUID,
    _units: _units,
}

// Shell Command: 
// % node lib/server.js start
if (process.argv[2] === 'start'){
   new AnimistServer().start();
}


