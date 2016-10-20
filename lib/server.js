
// ********************  This must run in its own process. ************************** 

'use strict'

// ----------------------------------- Imports -----------------------------------------
// Local
let config = require('../lib/config');
const terminal = require('../lib/terminal');
const util = require('../lib/util');
const handlers = require('../lib/handlers');
const defs = require('../lib/characteristics');

// NPM
// Bleno has to be mocked for Travis CI because bluetooth dependencies
// aren't whitelisted -> tests crash w/ a seg fault

// let bleno = require('bleno');
let bleno = require('../test/mocks/bleno.js');
const pouchdb = require('pouchdb');
const upsert = require('pouchdb-upsert');
const _ = require('lodash/array'); 

// ------------------------------------ Databases  --------------------------------------
pouchdb.plugin(upsert);

let animistEvents = (!process.env.TRAVIS) 
                    ? new pouchdb('http://localhost:5984/animistEvents') 
                    : new pouchdb('animistEvents');

// ----------------------------  Bleno Event Handlers ----------------------------------

const onStateChange = function(state){
    if (state === 'poweredOn') {

        bleno.startAdvertising(config.serverName, [this.service.uuid]);
        terminal.start(this);
    
    } else bleno.stopAdvertising();
}

const onAdvertisingStart = function(err){
             
    if (err) return;

    bleno.setServices([ this.service ]);
    terminal.advertising();
};

const onDisconnect = function(clientAddress){
    util.resetPin();
}

// No idea wtf. Is this the rssi of the connected device?
// If so is there any relationship btw this reading and the
// beacon proximity reading on the phone? Issue #12. This
// is about whether we can independently verify proximity. 
const onRssiUpdate = function(){

}

// ----------------------------  Broadcasts  ----------------------------------

/**
 * Updates the set of read characteristics to include a `uuid` which responds with `message`
 * and disconnects. Sets a timeout to remove characteristic after `duration`.
 * @param {Object} event  Eth log object with uuid, message and duration args. 
 * @return {Array}  Array of objects - bleno characteristics - currently broadcast.
 */
const addPublication = function(uuid, message, duration){

    // Set up new characteristic
    let publication = new bleno.Characteristic({
       uuid: uuid,
       properties: ['read'], 
       onReadRequest: (offset, callback) => {
            callback(config.codes.RESULT_SUCCESS, new Buffer(message));
            bleno.disconnect();
       }
    });

    // Save to list of currently requested broadcasts and update broadcasts (if unique).
    return animistEvents.get('publications')
        .then( doc => {
            if (isUniqueUUID(uuid, doc.characteristics)){
                doc.characteristics = doc.characteristics.push(publication);
                return animstEvents.put(doc).then( updateBroadcast );
            }
        })
        .catch( err => {
            characteristics.push(publication);
            return animistEvents.put('publications', characteristics ).then( updateBroadcast );
        })
}

/**
 * Removes `uuid` from current broadcast and from DB of current broadcasts.
 * @param  {String} uuid Characteristic UUID
 */
const removePublication = function(uuid){

    // Bleno strips dashes from uuid when constructing a characteristic object
    uuid = uuid.replace(/-/g, '');
    
    return animistEvents.get('publications').then( doc => {

        _.remove(doc.characteristics, item => item.uuid === uuid );
        return animistEvents.put(doc).then( updateBroadcast );
    })   
}

const updateBroadcast = function(){

    return animistEvents.get('publications').then( doc => {

    })
}

/**
 * Verifies that this uuid is NOT already being published.
 * @param  {String}  uuid [description]
 * @return {Boolean} True if uuid is not already being published, false otherwise
 */
const isUniqueUUID = function(uuid){

    let compare = (obj) => obj.uuid === uuid.replace(/-/g, '');
    return (_.findIndex(characteristics, compare) === -1)

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

    server.characteristics.push(uuid1);
    server.characteristics.push(uuid2);
    bleno.setServices([server.service]);
}


// --------------------------- Class: Animist Server ----------------------------------

class AnimistServer {

    constructor() {

        // Service
        this.service = new bleno.PrimaryService({
            uuid: config.serverServiceId,
            characteristics: [
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
            ]
        });

        this.addPublication = addPublication;
        this.removePublication = removePublication;
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
    removePublication : removePublication,
    updateBroadcast : updateBroadcast
}

// Shell Command: 
// % node lib/server.js start
if (process.argv[2] === 'start'){
   
   new AnimistServer().start();
}


