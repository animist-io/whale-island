"use strict"

/*
 ********************  This must run in its own process. **************************
 * Filters for events triggered by any call the Animist event contract by 
 * client contracts. Currently two possible requests: Verify presence of client client and
 * publish message on unique characteristic.  
 */

// Local
const config = require('../lib/config.js');
const server = require('../lib/server.js');

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
const nodeAccount = web3.eth.accounts[0];

// ----------------------------- Web3 Development (morden) --------------------------------
// Stub
// ----------------------------- Web3 Production  -----------------------------------------
// Stub

// ----------------------------- Databases  -----------------------------------------------
pouchdb.plugin(upsert);

let animistEvents = (!process.env.TRAVIS) 
                    ? new pouchdb('http://localhost:5984/animistEvents') 
                    : new pouchdb('animistEvents');

// ----------------------------- Locals  --------------------------------------------------

let contract = web3.eth.contract(config.eventsABI);
let eventsContract = contract.at(config.eventsContractAddress);
let errors = config.events.filters;
let characteristics = [];
let service = null;

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
 * Validates message publication event data. 
 * @param  {Object}  event `{ uuid: <uuid string>, message: <string>, duration: <number of ms>` }
 * @return {Boolean} True if data validates, false otherwise.   
 */
const isValidMessagePublicationEvent = exports.isValidMessagePublicationEvent = function(event){

    return (validator.isUUID(event.args.uuid) &&
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
const getLastSavedBlock = exports.getLastSavedBlock = function(){

    return animistEvents.get('lastBlock')
        .then( doc => doc.val )
        .catch( err => config.deviceGenesisBlock )
}


/**
 * Saves blocknumber of most recently logged event. This value serves as a starting point for the 
 * events filter in the start...EventFilter methods
 * @param  {Object} db Event DB    
 * @param  {Number} block Current block number       
 */
const saveBlock = exports.saveBlock = function(block){

    return animistEvents.upsert('lastBlock', doc => {
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

    return animistEvents.put({ 
        _id: event.args.account, 
        contractAddress: event.args.contractAddress
    });
} 

/**
 * Generates a random value within the limits of allowed major and minor beacon values
 * @return {Number} Number between 0 and 65535 inclusive
 */
function generateRandom2ByteInt() {
    return Math.floor(Math.random() * (65535 - 0 + 1)) + min;
}

/**
 * Combines requested Beacon uuid and randomly generated major and minor
 * values into a string. Signs this with the nodeAccount and formats it correctly
 * for passage to submit to client's submitSignedBeaconId method
 * @param  {String} uuid  v4 uuid
 * @param  {Number} major Integer btw 0 and 65535
 * @param  {Number} minor Integer btw 0 and 65535
 * @return {Object}       EC sig obj that Solidity will parse correctly
 */
function generateBeaconSignature(uuid, major, minor){
    
    // Format as: <uuid>:<major>:<minor>
    let msg = uuid + ':' + major + ':' + minor;
    let msgHash = util.addHexPrefix(util.sha3(msg).toString('hex'));
    let signed = web3.eth.sign(nodeAccount, msgHash);
    let sig = util.fromRpcSig(signed);

    // Covert to hex string for correct bytes32 translation
    sig.r = util.addHexPrefix(sig.r.toString('hex'));
    sig.s = util.addHexPrefix(sig.s.toString('hex'));
    return sig;
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
const startPresenceVerificationRequestsFilter = function( eventsContractAddress, cb ){

    // Instantiate Events contract
    let eventsContract = web3.eth.contract(config.eventsABI);
    eventsContract = eventsContract.at(eventsContractAddress);

    // Start filtering for and saving presence verfication requests
    return getLastSavedBlock().then( last => {
        eventsContract.LogPresenceVerificationRequest(null, {fromBlock: last, toBlock: 'latest'}, (err, event) => {
            
            if (err){
                console.log(errors.web3Error + err);

            } else if (isValidPresenceVerificationEvent(event)){

                Promise.all( [ 
                    addPresenceVerificationRequest(event),
                    saveBlock(event.blockNumber )
                ])
                .then( cb )
                .catch( err => console.log(errors.dbError + err) )

            } else emit(errors.validationError, JSON.stringify(event));
        })     
    });
};
exports.startPresenceVerificationRequestsFilter = startPresenceVerificationRequestsFilter;

/**
 * Starts listening for message publication request events on blockchain. Validates event data and changes the broadcast. 
 * @param  {Function} cb (Optional) Callback to execute when an event is logged.
 */
const startMessagePublicationRequestsFilter = function( eventsContractAddress, startBlock, cb ){

    // Instantiate Events contract
    let eventsContract = web3.eth.contract(config.eventsABI);
    eventsContract = eventsContract.at(eventsContractAddress);

    eventsContract.LogMessagePublicationRequest(null, {fromBlock: startBlock, toBlock: 'latest'}, (err, event) => {
        
        if (err) { // Publish errors

        } else if ( isValidMessagePublicationEvent(event) ){

            event.args.duration = event.args.duration.toNumber()
            server.addPublication(event.args.uuid, event.args.message, event.args.duration);
            cb();

        } else {} // Publish errors
    }) 
}
exports.startMessagePublicationRequestsFilter = startMessagePublicationRequestsFilter;

const startBeaconBroadcastRequestsFilter = function( eventsContractAddress, startBlock ){

    // Instantiate Events contract
    let eventsContract = web3.eth.contract(config.eventsABI);
    eventsContract = eventsContract.at(eventsContractAddress);

    eventsContract.LogBeaconBroadcastRequest(null, {fromBlock: startBlock, toBlock: 'latest'}, (err, event) => {
        
        if (err) { // Publish errors

        } else if ( validator.isUUID(event.args.uuid) ){

            // Generate beacon vals & sign beacon.
            let major = generateRandom2ByteInt();
            let minor = generateRandom2ByteInt();
            let sig = generateBeaconSignature(); 

            // Instantiate client contract from address in event
            let clientContract = web3.eth.contract(config.methodsABI);
            let instance = clientContract.at(event.args.contractAddress);

            // Transform BN to int (okay b/c duration is uint64)
            event.args.duration = event.args.duration.toNumber();

            // Save signed beacon to client contract and queue beacon for broadcast
            if (instance){
                
                instance.submitSignedBeaconId(sig.v, sig.r, sig.s)
                    .then( res => server.addPublication(event.args.uuid, event.args.message, event.args.duration)
                    .then( cb ))
                    .catch( cb );
            }
            
        
        } else {} // Publish errors
    }) 

}
exports.startBeaconBroadcastRequestsFilter = startBeaconBroadcastRequestsFilter;

// --------------------------   Convenience Fns for Unit Tests  ---------------------

const _units = exports._units = {
    setDB: (db) => animistEvents = db,
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

