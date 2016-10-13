"use strict"

/*
// ********************  This must run in its own process. **************************

 * Filters for events triggered by an invocation of the node's event contract by 
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
// bleno = require('bleno');
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



let proximityContracts = (!process.env.TRAVIS) 
                    ? new pouchdb('http://localhost:5984/proximityContracts') 
                    : new pouchdb('proximityContracts');

let broadcastContracts = (!process.env.TRAVIS) 
                    ? new pouchdb('http://localhost:5984/broadcastContracts') 
                    : new pouchdb('broadcastContracts');

// ----------------------------- Locals  --------------------------------------------------

let contract = web3.eth.contract(config.eventsABI);
let eventsContract = contract.at(config.eventsContractAddress);
let errors = config.events.filters;
let characteristics = [];
let service = null;

// ----------------------------- Test  ----------------------------------------------------

// ------------------------------ Utilities -----------------------------------------------

/**
 * STUB: Validates duration topic of a broadcast event log.
 * @param  {BigNumber} duration milliseconds to broadcast for
 * @return {Boolean} True if duration at least 1s and < uint32 MAX. False otherwise.
 */
const isValidDuration = exports.isValidDuration = function(duration){ 
    duration = duration.toNumber();
    return (duration >= 1000 && duration < 4294967295 );
};

/**
 * Validates message arg of a broadcast event log if message is non-null and
 * less than or equal to config.MAX_MESSAGE_LENGTH
 * @param  {String}  message 
 * @return {Boolean} True if message is valid, false otherwise.        
 */
const isValidMessage = exports.isValidMessage = function(message){
    return (message.length > 0 && message.length <= config.MAX_MESSAGE_LENGTH);
};

/**
 * Validates broadcast event topics
 * @param  {Object}  event `{ channel: <uuid string>, message: <string>, duration: <number of ms>` }
 * @return {Boolean} True if topics validate, false otherwise.   
 */
const isValidBroadcastEvent = exports.isValidBroadcastEvent = function(event){

    return (validator.isUUID(event.args.channel) &&
            isValidMessage(event.args.message) &&
            isValidDuration(event.args.duration))
}

/**
 * Validates proximity detection request event topics
 * @param  {Objects}  event `{ account: <address>, contract: <address>}` }
 * @return {Boolean}  True if topics validate, false otherwise.
 */
const isValidProximityEvent = exports.isValidProximityEvent = function(event){
    
    return (ethjs_util.isValidAddress(event.args.account) &&
            ethjs_util.isValidAddress(event.args.contractAddress))
}

/**
 * Retrieves last block for which a event was saved. This allows whale-island to synch its 
 * events db to blockchain if it's been turned off without filtering for every event since
 * the genesis block
 * @param  {Object} db Event DB (proximityEvents OR broadcastEvents)
 * @return {Number}    Block number
 * @return {Promise}   Result of db.upsert
 */
const getLastSavedBlock = exports.getLastSavedBlock = function(db){

    return db.get('lastBlock')
        .then( doc => doc.val )
        .catch( err => config.deviceGenesisBlock )
}


/**
 * Saves blocknumber of a filtered event. This value serves as a starting point for the 
 * events filter in the start<type>EventFilter method
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
 * Adds record to the proximityEvent database of an account address to verify the proximity of and
 * the address of the contract requesting this service: 
 * `{_id: <Account address>, contractAddress: <Contract address>}`
 * @param {Object} event `{account: <address>, contractAddress: <address>}` 
 */
const addProximityDetectionRequest = exports.addProximityDetectionRequest = function( event ){

    return proximityContracts.upsert(event.args.account, doc => {
        doc.contractAddress = event.args.contractAddress;
        return doc 
    })
} 

/**
 * Updates the set of read characteristics to include a `channel` which responds with `message`
 * and disconnects. Sets a timeout to remove characteristic after `duration.
 * @param {String} channel  Characteristic UUID 
 * @param {String} message  Arbitrary non-null string, size <= config.MAX_MESSAGE_LENGTH.
 * @param {BigNumber} duration (Optional) Number of ms to broadcast signal for.
 */
const addBroadcast = exports.addBroadcast = function(channel, message, duration){

    let service, broadcast;

    broadcast = new bleno.Characteristic({
       uuid: channel,
       properties: ['read'], 
       onReadRequest: (offset, callback) => {
            callback(config.codes.RESULT_SUCCESS, new Buffer(message));
            bleno.disconnect();
       }
    });

    characteristics.push(broadcast);

    service = new bleno.PrimaryService({
        uuid: config.broadcasterServiceId,
        characteristics: characteristics   
    });

    changeBroadcast();

    duration = duration.toNumber() || config.defaultBroadcastDurationMs;

    setTimeout(() => removeBroadcast(channel), duration);

} 

/**
 * Removes `channel` from current broadcast.
 * @param  {String} channel Characteristic UUID
 */
const removeBroadcast = exports.removeBroadcast = function(channel){
    _.remove(characteristics, item => item.uuid === channel );
    changeBroadcast();
}


/**
 * Updates broadcast to reflect current set of `characteristics`.
 */
const changeBroadcast = exports.changeBroadcast = function(){

    service = new bleno.PrimaryService({
        uuid: config.broadcasterServiceId,
        characteristics: characteristics   
    });

    // Option 1: Can't dynamically change what characteristics are broadcast
    bleno.stopAdvertising( err => {
        if (err){
            emit(errors.blenoError, err);
            return;
        } else {
            bleno.startAdvertising(config.broadcasterName, [service.uuid]);
        }
    })

    // Option 2: CAN change characteristics by calling bleno.setServices
    bleno.setServices([service]);
}

// ------------------------------ Core --------------------------------------------------------------

/**
 * Starts listening for proximity detection request events on blockchain from proximityEvents DB's 
 * `lastBlock` to 'latest'. Validates event data, saves it and updates 'lastBlock' value to the 
 * event's blockNumber. 
 * @param  {Function} cb (Optional) Callback to execute when an event is logged and saved in the DB
 */
const startProximityDetectionRequestsFilter = exports.startProximityContractFilter = function( cb ){

    getLastSavedBlock( proximityContracts ).then( last => {

        eventsContract.LogRegistration(null, {fromBlock: last, toBlock: 'latest'}, (err, event) => {
            
            if (err){
                emit(errors.web3Error, err);
                return;

            } else if (isValidProximityEvent(event)){

                Promise.all( [ 
                    addProximityEvent(event),
                    saveBlock(proximityContracts, event.blockNumber )
                ])
                .then( cb )
                .catch( err => emit(errors.dbError, err) )

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
const startBroadcastRequestsFilter = exports.startBroadcastContractFilter = function( cb ){

    getLastSavedBlock( broadcastContracts ).then( last => {

        eventsContract.LogBroadcast(null, {fromBlock: last, toBlock: 'latest'}, (err, event) => {
            
            if (err) {
                emit(errors.web3Error, err);
                return;

            } else if ( isValidBroadcastEvent(event) ){

                Promise.all( [ 
                    addBroadcast(event.channel, event.val ),
                    saveBlock(broadcastContracts, event.blockNumber )
                ])
                .then( cb )
                .catch( err => emit(filter.dbError, err) ) 

            } else emit(errors.validationError, event);
        }) 
    });
}

const _units = exports._units = {
    setDB: (db) => proximityContracts = db,
    getBroadcasts: () => characteristics,
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

        startProximityDetectionRequestsFilter();
        startBroadcastRequestsFilter();
    }    
};

// Shell Command: 
// % node lib/server.js start
if (process.argv[2] === 'start'){
   new AnimistBroadcaster().start();
}

