"use strict"

/*
// ********************  This must run in its own process. **************************

 * Filters for events triggered by any call the Animist event contract by 
 * client contracts. Currently two possible requests: Proximity detect client and
 * broadcast unique signal.  
 *
 * node-uuid: usage: 
 * https://github.com/broofa/node-uuid
 *
 * super compact: https://gist.github.com/jed/982883 (produces a v4 uuid)
 * function uuidgen(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b)}
 */

// Local
const config = require('../lib/config.js');

// Ethereum
const Web3 = require('web3');
const ethjs_util = require('ethereumjs-util');
const util = require('../lib/util.js')

// NPM
const pouchdb = require('pouchdb');
const upsert = require('pouchdb-upsert');
const validator = require('validator');
const _ = require('lodash/array');

// Bleno has to be mocked for Travis CI because bluetooth dependencies not whitelisted

//const bleno = require('bleno');
const bleno = require('../test/mocks/bleno.js'); 

// ----------------------------- Web3 Testing (test-rpc) ----------------------------------

let testRpc = new Web3.providers.HttpProvider("http://localhost:8545");
const web3 = new Web3(testRpc);
const deviceAccount = web3.eth.accounts[0];

// ----------------------------- Web3 Development (morden) --------------------------------
// Stub
// ----------------------------- Web3 Production  -----------------------------------------
// Stub

// ----------------------------- Databases  -----------------------------------------------
pouchdb.plugin(upsert);

let proximityContracts = (!process.env.TRAVIS) 
                    ? new pouchdb('http://localhost:5984/proximityContracts') 
                    : new pouchdb('proximityContracts');

// ----------------------------- Locals  --------------------------------------------------

let contract = web3.eth.contract(config.eventsABI);
let eventsContract = contract.at(config.eventsContractAddress);
let errors = config.events.filters;
let characteristics = [];
let service = null;

// ----------------------------- Test  ----------------------------------------------------

// ------------------------------ Utilities -----------------------------------------------

/**
 * Validates duration arg of a broadcast event log. Duration must at least 1 sec and 
 * smaller than the max value of uint32.
 * @param  {BigNumber} duration milliseconds to broadcast for
 * @return {Boolean} True if duration valid, false otherwise.
 */
const isValidDuration = exports.isValidDuration = function(duration){ 
    duration = duration.toNumber();
    return (duration >= config.MIN_BROADCAST_DURATION && 
            duration <= config.MAX_BROADCAST_DURATION );
};

/**
 * Validates message arg of a broadcast event log. Message must be non-null and
 * less than or equal to config.MAX_MESSAGE_LENGTH
 * @param  {String}  message 
 * @return {Boolean} True if message is valid, false otherwise.        
 */
const isValidMessage = exports.isValidMessage = function(message){
    return (message.length > 0 && message.length <= config.MAX_MESSAGE_LENGTH);
};

/**
 * Validates uuid string and verifies that this uuid is NOT already being broadcast.
 * @param  {String}  uuid [description]
 * @return {Boolean} True if uuid is valid, false otherwise
 */
const isValidUUID = exports.isValidUUID = function(uuid){
    return ( validator.isUUID(uuid) ) // AND !!!!!
}

/**
 * Validates broadcast event data. 
 * @param  {Object}  event `{ channel: <uuid string>, message: <string>, duration: <number of ms>` }
 * @return {Boolean} True if data validates, false otherwise.   
 */
const isValidBroadcastEvent = exports.isValidBroadcastEvent = function(event){

    return (isValidUUID(event.args.channel) &&
            isValidMessage(event.args.message) &&
            isValidDuration(event.args.duration))
}


/**
 * Validates proximity detection request event data
 * @param  {Objects}  event `{ account: <address>, contract: <address>}` }
 * @return {Boolean}  True if data validates, false otherwise.
 */
const isValidProximityEvent = exports.isValidProximityEvent = function(event){
    
    return (ethjs_util.isValidAddress(event.args.account) &&
            ethjs_util.isValidAddress(event.args.contractAddress))
}

/**
 * Retrieves last block for which an event was logged. This allows whale-island to synch its 
 * events db to blockchain if it's been turned off without filtering for every event since
 * the device's genesis block
 * @param  {Object} db Event DB (proximityEvents OR broadcastEvents)
 * @return {Number}    Block number
 * @return {Promise}   Result of db.get OR device genesis block if DB is new.
 */
const getLastSavedBlock = exports.getLastSavedBlock = function(db){

    return db.get('lastBlock')
        .then( doc => doc.val )
        .catch( err => config.deviceGenesisBlock )
}


/**
 * Saves blocknumber of most recently logged event. This value serves as a starting point for the 
 * events filter in the start...EventFilter methods
 * @param  {Object} db    proximityEvents DB OR broadcastEvents DB
 * @param  {Number} block Current block number       
 */
const saveBlock = exports.saveBlock = function(db, block){

    return db.upsert('lastBlock', doc => {
        doc.val = block 
        return doc;
    })
}

/**
 * Adds account address to verify the proximity of and the address of the contract requesting this service 
 * to the proximityEvents db. Will not allow duplicate clients.
 * `{_id: <Account address>, contractAddress: <Contract address>}`
 * @param {Object} event `{account: <address>, contractAddress: <address>}` 
 */
const addProximityDetectionRequest = exports.addProximityDetectionRequest = function( event ){

    return proximityContracts.put({ 
        _id: event.args.account, 
        contractAddress: event.args.contractAddress
    });
} 

/**
 * Updates the set of read characteristics to include a `channel` which responds with `message`
 * and disconnects. Sets a timeout to remove characteristic after `duration`.
 * @param {Object} event  Eth log object with channel, message and duration args. 
 * @return {Array}  Array of objects - bleno characteristics - currently broadcast.
 */
const addBroadcast = exports.addBroadcast = function(event){

    let broadcast,
        channel = event.args.channel,   // UUID string
        message = event.args.message,   // String (128)
        duration = event.args.duration; // Big Number <= uint32 max.

    // Convert duration
    (duration) 
        ? duration = duration.toNumber()
        : duration = config.defaultBroadcastDurationMs;

    // Set up new characteristic
    broadcast = new bleno.Characteristic({
       uuid: channel,
       properties: ['read'], 
       onReadRequest: (offset, callback) => {
            callback(config.codes.RESULT_SUCCESS, new Buffer(message));
            bleno.disconnect();
       }
    });

    // Update current broadcast
    characteristics.push(broadcast);
    changeBroadcast();

    // Set timeout to terminate broadcast after duration.
    setTimeout( () => removeBroadcast(channel), duration);
    return characteristics;
} 

/**
 * Removes `channel` from current broadcast.
 * @param  {String} channel Characteristic UUID
 */
const removeBroadcast = exports.removeBroadcast = function(channel){
    channel = channel.replace(/-/g, '');
    _.remove(characteristics, item => item.uuid === channel );
    changeBroadcast();
}


/**
 * Updates broadcast to reflect current set of `characteristics`.
 */
const changeBroadcast = exports.changeBroadcast = function(){

    let service = new bleno.PrimaryService({
        uuid: config.broadcasterServiceId,
        characteristics: characteristics   
    });

    /* Option 1: Can't dynamically change what characteristics are broadcast
    bleno.stopAdvertising( err => {
        if (err){
            emit(errors.blenoError, err);
            return;
        } else {
            bleno.startAdvertising(config.broadcasterName, [service.uuid]);
        }
    })*/

    // Option 2: CAN change characteristics by calling bleno.setServices
    //bleno.setServices([service]);
}

// -------------------------------------------  Core ------------------------------------------------------------

/**
 * Starts listening for proximity detection request events on blockchain from proximityEvents DB's 
 * `lastBlock` to 'latest'. Validates event data, saves it and updates 'lastBlock' value to the 
 * event's blockNumber. 
 * @param  {Function} cb (Optional) Callback to execute when an event is logged and saved in the DB
 */
const startProximityDetectionRequestsFilter = exports.startProximityDetectionRequestsFilter = function( contractAddress, cb ){

    // Instantiate Events contract
    let eventsContract = web3.eth.contract(config.eventsABI);
    eventsContract = eventsContract.at(contractAddress);

    // Start filtering for and saving proximity detection requests
    return getLastSavedBlock( proximityContracts ).then( last => {
        eventsContract.LogProximityDetectionRequest(null, {fromBlock: last, toBlock: 'latest'}, (err, event) => {
            
            if (err){
                console.log(errors.web3Error + err);

            } else if (isValidProximityEvent(event)){

                Promise.all( [ 
                    addProximityDetectionRequest(event),
                    saveBlock(proximityContracts, event.blockNumber )
                ])
                .then( cb )
                .catch( err => console.log(errors.dbError + err) )

            } else emit(errors.validationError, event);
        }) 
        
    });
}

/**
 * Starts listening for broadcast request events on blockchain from broadcastEvents DB's 
 * `lastBlock` to 'latest'. Validates event data, changes the broadcast and updates 'lastBlock' 
 * value to the event's blockNumber. 
 * @param  {Function} cb (Optional) Callback to execute when an event is logged and saved in the DB
 */
const startBroadcastRequestsFilter = exports.startBroadcastRequestsFilter = function( cb ){

    // Instantiate Events contract
    let eventsContract = web3.eth.contract(config.eventsABI);
    eventsContract = eventsContract.at(contractAddress);

    // Start filtering for and updating broadcast requests
    return getLastSavedBlock( broadcastContracts ).then( last => {

        eventsContract.LogBroadcastBroadcastRequest(null, {fromBlock: last, toBlock: 'latest'}, (err, event) => {
            
            if (err) {
                console.log(errors.web3Error + err);

            } else if ( isValidBroadcastEvent(event) ){
                addBroadcast(event);
                cb();

            } else console.log(errors.validationError + event);
        }) 
    });
}

// --------------------------   Convenience Fns for Unit Tests  ---------------------

const _units = exports._units = {
    setDB: (db) => proximityContracts = db,
    getBroadcasts: () => characteristics,
    clearBroadcasts: () => characteristics = [],
    getBroadcastDB: () => broadcastContracts
}


// ----------------------------  Bleno Event Handlers ----------------------------------

const onStateChange = function(state){
    if (state === 'poweredOn') {

        bleno.startAdvertising(config.broadcasterName, [this.service.uuid]);
        terminal.start(this);
    
    } else bleno.stopAdvertising();
}

const onAdvertisingStart = function(err){
             
    if (err) return;

    bleno.setServices([ service ]);
    terminal.advertising();
};

// --------------------------- Class: AnimistBroadcaster ----------------------------------
class AnimistBroadcaster {

    // Set up listeners on launch
    start() {
        service = new bleno.PrimaryService({
            uuid: config.broadcasterServiceId,
            characteristics: characteristics   
        });
        bleno.on('stateChange', onStateChange.bind(this));
        bleno.on('advertisingStart', onAdvertisingStart.bind(this));

        startProximityDetectionRequestsFilter(config.eventsContractAddress);
        startBroadcastRequestsFilter(config.eventsContractAddress);
    }    
};

// Shell Command: 
// % node lib/server.js start
if (process.argv[2] === 'start'){
   new AnimistBroadcaster().start();
}

