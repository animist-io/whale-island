"use strict"

/*
// ********************  This must run in its own process. **************************

 * Filters for events triggered by any call the Animist event contract by 
 * client contracts. Currently two possible requests: Verify presence of client client and
 * publish message on unique characteristic.  
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
 * Validates duration arg of a message publication event log. Duration must at least 1 sec and 
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
 * Validates message arg of a message publication event log. Message must be non-null and
 * less than or equal to config.MAX_MESSAGE_LENGTH
 * @param  {String}  message 
 * @return {Boolean} True if message is valid, false otherwise.        
 */
const isValidMessage = exports.isValidMessage = function(message){
    return (message.length > 0 && message.length <= config.MAX_MESSAGE_LENGTH);
};

/**
 * Validates uuid string and verifies that this uuid is NOT already being published.
 * @param  {String}  uuid [description]
 * @return {Boolean} True if uuid is valid, false otherwise
 */
const isValidUUID = exports.isValidUUID = function(uuid){

    let compare = (obj) => obj.uuid === uuid.replace(/-/g, '');

    return ( validator.isUUID(uuid) &&
             _.findIndex(characteristics, compare) === -1 )
}

/**
 * Validates message publication event data. 
 * @param  {Object}  event `{ uuid: <uuid string>, message: <string>, duration: <number of ms>` }
 * @return {Boolean} True if data validates, false otherwise.   
 */
const isValidMessagePublicationEvent = exports.isValidMessagePublicationEvent = function(event){

    return (isValidUUID(event.args.uuid) &&
            isValidMessage(event.args.message) &&
            isValidDuration(event.args.duration))
}


/**
 * Validates presence verification request event data
 * @param  {Objects}  event `{ account: <address>, contract: <address>}` }
 * @return {Boolean}  True if data validates, false otherwise.
 */
const isValidPresenceVerificationEvent = exports.isValidPresenceVerificationEvent = function(event){
    
    return (ethjs_util.isValidAddress(event.args.account) &&
            ethjs_util.isValidAddress(event.args.contractAddress))
}

/**
 * Retrieves last block for which an event was logged. This allows whale-island to synch its 
 * events db to blockchain if it's been turned off without filtering for every event since
 * the device's genesis block
 * @param  {Object} db Event DB 
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
 * @param  {Object} db Event DB    
 * @param  {Number} block Current block number       
 */
const saveBlock = exports.saveBlock = function(db, block){

    return db.upsert('lastBlock', doc => {
        doc.val = block 
        return doc;
    })
}

/**
 * Adds account address to verify the presence of and the address of the contract requesting this service 
 * to the proximityEvents db. Will not allow duplicate clients.
 * `{_id: <Account address>, contractAddress: <Contract address>}`
 * @param {Object} event `{account: <address>, contractAddress: <address>}` 
 */
const addPresenceVerificationRequest = exports.addPresenceVerificationRequest = function( event ){

    return proximityContracts.put({ 
        _id: event.args.account, 
        contractAddress: event.args.contractAddress
    });
} 

/**
 * Updates the set of read characteristics to include a `uuid` which responds with `message`
 * and disconnects. Sets a timeout to remove characteristic after `duration`.
 * @param {Object} event  Eth log object with uuid, message and duration args. 
 * @return {Array}  Array of objects - bleno characteristics - currently broadcast.
 */
const addPublication = exports.addPublication = function(event){

    let publication,
        uuid = event.args.uuid,   // UUID string
        message = event.args.message,   // String (128)
        duration = event.args.duration; // Big Number <= uint32 max.

    // Convert duration
    (duration) 
        ? duration = duration.toNumber()
        : duration = config.defaultBroadcastDurationMs;

    // Set up new characteristic
    publication = new bleno.Characteristic({
       uuid: uuid,
       properties: ['read'], 
       onReadRequest: (offset, callback) => {
            callback(config.codes.RESULT_SUCCESS, new Buffer(message));
            bleno.disconnect();
       }
    });

    // Update current broadcast
    characteristics.push(publication);
    changeBroadcast();

    // Set timeout to terminate broadcast after duration.
    setTimeout( () => removePublication(uuid), duration);
    return characteristics;
} 

/**
 * Removes `uui` from current broadcast.
 * @param  {String} uuid Characteristic UUID
 */
const removePublication = exports.removePublication = function(uuid){
    uuid = uuid.replace(/-/g, '');
    _.remove(characteristics, item => item.uuid === uuid );
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
 * Starts listening for presence verfication request events on blockchain from proximityEvents DB's 
 * `lastBlock` to 'latest'. Validates event data, saves it and updates 'lastBlock' value to the 
 * event's blockNumber. 
 * @param  {Function} cb (Optional) Callback to execute when an event is logged and saved in the DB
 */
const startPresenceVerificationRequestsFilter = exports.startPresenceVerificationRequestsFilter = function( contractAddress, cb ){

    // Instantiate Events contract
    let eventsContract = web3.eth.contract(config.eventsABI);
    eventsContract = eventsContract.at(contractAddress);

    // Start filtering for and saving presence verfication requests
    return getLastSavedBlock( proximityContracts ).then( last => {
        eventsContract.LogPresenceVerificationRequest(null, {fromBlock: last, toBlock: 'latest'}, (err, event) => {
            
            if (err){
                console.log(errors.web3Error + err);

            } else if (isValidPresenceVerificationEvent(event)){

                Promise.all( [ 
                    addPresenceVerificationRequest(event),
                    saveBlock(proximityContracts, event.blockNumber )
                ])
                .then( cb )
                .catch( err => console.log(errors.dbError + err) )

            } else emit(errors.validationError, JSON.stringify(event));
        }) 
        
    });
}

/**
 * Starts listening for message publication request events on blockchain. Validates event data and changes the broadcast. 
 * @param  {Function} cb (Optional) Callback to execute when an event is logged.
 */
const startMessagePublicationRequestsFilter = exports.startMessagePublicationRequestsFilter = function( contractAddress, startBlock, cb ){

    // Instantiate Events contract
    let eventsContract = web3.eth.contract(config.eventsABI);
    eventsContract = eventsContract.at(contractAddress);

    eventsContract.LogMessagePublicationRequest(null, {fromBlock: startBlock, toBlock: 'latest'}, (err, event) => {
        
        if (err) {
            console.log(errors.web3Error + err);

        } else if ( isValidMessagePublicationEvent(event) ){
            addPublication(event);
            cb();

        } else console.log(errors.validationError + JSON.stringify(event));
    }) 
}

// --------------------------   Convenience Fns for Unit Tests  ---------------------

const _units = exports._units = {
    setDB: (db) => proximityContracts = db,
    getBroadcasts: () => characteristics,
    clearBroadcasts: () => characteristics = [],
    addToBroadcasts: (b) => characteristics.push(b),
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

        startPresenceVerificationRequestsFilter(config.eventsContractAddress);
        startMessagePublicationRequestsFilter(config.eventsContractAddress, web3.eth.blockNumber);
    }    
};

// Shell Command: 
// % node lib/server.js start
if (process.argv[2] === 'start'){
   new AnimistBroadcaster().start();
}

