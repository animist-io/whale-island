"use strict"

/*
 * Filters for AnimistEvent contract events. Currently three possible requests: 
 * + Verify presence of client 
 * + Publish message on unique characteristic.  
 * + Broadcast requestable beacon.
 */

// Local
const config = require('../lib/config.js');

// Ethereum
const Web3 = require('web3');
const util = require('ethereumjs-util');

// NPM
const pouchdb = require('pouchdb');
const upsert = require('pouchdb-upsert');
const validator = require('validator');

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

let errors = config.events.filters;                // Error msgs
let presenceFilter, messageFilter, beaconFilter;   // web3 filter objects to turn on/off


// ------------------------------ Utilities -----------------------------------------------

/**
 * Validates `expires` arg of a message publication event log. Duration must at least 1 sec and 
 * smaller than the max value of uint32. If expires is before now, this test will return false.
 * @param  {BigNumber} expires date (ms since Epoch) that broadcast should end.
 * @return {Boolean} True if duration valid, false otherwise.
 */
const isValidExpirationDate = exports.isValidExpirationDate = function(expires){ 
    let duration = expires.toNumber() - Date.now();
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
 * @param  {Object}  event `{ uuid: <uuid string>, message: <string>, expires: <date in ms>` }
 * @return {Boolean} True if data validates, false otherwise.   
 */
const isValidMessagePublicationEvent = exports.isValidMessagePublicationEvent = function(event){

    return (validator.isUUID(event.args.uuid) &&
            isValidMessage(event.args.message) &&
            isValidExpirationDate(event.args.expires))
}

/**
 * Validates presence verification request event data
 * @param  {Objects}  event `{ account: <address>, contract: <address>}` }
 * @return {Boolean}  True if data validates, false otherwise.
 */
const isValidPresenceVerificationEvent = exports.isValidPresenceVerificationEvent = function(event){
    
    return (util.isValidAddress(event.args.account) &&
            util.isValidAddress(event.args.contractAddress))
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
    return Math.floor(Math.random() * (65535 - 0 + 1)) + 0;
}

/**
 * Combines requested Beacon uuid and randomly generated major and minor
 * values into a string. Signs this with the nodeAccount and formats it correctly
 * for passage to client's submitSignedBeaconId method
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

// -------------------------------------------  Core ------------------------------------------------------------

/**
 * Starts listening for presence verfication request events on blockchain from proximityEvents DB's 
 * `lastBlock` to 'latest'. Validates event data, saves it and updates 'lastBlock' value to the 
 * event's blockNumber. 
 * @param  {String} eventsContractAddress   Address of the deployed AnimistEvents contract
 * @param  {Function} cb (Optional) Callback to execute when an event is logged and saved in the DB
 */
const startPresenceVerificationRequestsFilter = function( eventsContractAddress, cb ){

    // Instantiate Events contract
    let topic = {node: nodeAccount};
    let eventsContract = web3.eth.contract(config.eventsABI);
    eventsContract = eventsContract.at(eventsContractAddress);

    // Start filtering for and saving presence verfication requests
    getLastSavedBlock().then( last => {
        presenceFilter = eventsContract.LogPresenceVerificationRequest(topic, {fromBlock: last, toBlock: 'latest'});
        presenceFilter.watch((err, event) => {
            
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
exports.stopPresenceFilter = () =>  presenceFilter.stopWatching();
exports.startPresenceVerificationRequestsFilter = startPresenceVerificationRequestsFilter;

/**
 * Starts listening for message publication request events on blockchain. Validates event data and invokes `server`'s 
 * addPublication method for each event. 
 * @param  {String} eventsContractAddress   Address of the deployed AnimistEvents contract
 * @param  {Function} addPublication        Callback to pass event data to so server can cast it.
 * @param  {Function} cb                    (Optional) Callback to execute when an event is logged.
 */
const startMessagePublicationRequestsFilter = function( eventsContractAddress, addPublication, cb ){

    // Instantiate Events contract
    let topic = { node: nodeAccount };
    let eventsContract = web3.eth.contract(config.eventsABI);
    eventsContract = eventsContract.at(eventsContractAddress);

    getLastSavedBlock().then( last => {
        messageFilter = eventsContract.LogMessagePublicationRequest(topic, {fromBlock: last, toBlock: 'latest'});
        messageFilter.watch((err, event) => {
        
            if (err) { // Publish errors

            } else if ( isValidMessagePublicationEvent(event) ){

                // Transform BN to int (okay b/c max broadcast duration is set to uint32)
                event.args.expires = event.args.expires.toNumber();
                addPublication(event.args.uuid, event.args.message, event.args.expires);
                cb();

            } else cb(errors.validationError);
        })
    }) 
}
exports.stopMessageFilter = () =>  messageFilter.stopWatching();
exports.startMessagePublicationRequestsFilter = startMessagePublicationRequestsFilter;

/**
 * Starts listening for beacon broadcast request events on blockchain. Validates event data and invokes `server`'s 
 * addPublication method for each event. 
 * @param  {String} eventsContractAddress   Address of the deployed AnimistEvents contract
 * @param  {Function} addBeacon             Callback to pass event data to so beacon can cast it.
 * @param  {Function} cb                    (Optional) Callback to execute when an event is logged.
 */
const startBeaconBroadcastRequestsFilter = function( eventsContractAddress, addBeacon, cb ){

    // Setup & instantiate Events contract
    let now = web3.eth.blockNumber;
    let topic = { node: nodeAccount };
    let eventsContract = web3.eth.contract(config.eventsABI);
    eventsContract = eventsContract.at(eventsContractAddress);
    
    beaconFilter = eventsContract.LogBeaconBroadcastRequest(topic, {fromBlock: now, toBlock: 'latest'});
    beaconFilter.watch(( err, event ) => {
        
        if (err)
            console.log('ERROR: + err') 

        else if ( validator.isUUID(event.args.uuid ) && (event.blockNumber === web3.eth.blockNumber) ){

            // Generate beacon vals & sign beacon.
            let major = generateRandom2ByteInt();
            let minor = generateRandom2ByteInt();
            let sig = generateBeaconSignature(event.args.uuid, major, minor); 

            // Instantiate client contract from address in event
            let clientContract = web3.eth.contract(config.methodsABI);
            let instance = clientContract.at(event.args.contractAddress);

            // Save signed beacon to client contract and queue beacon for broadcast
            if (instance){
        
                instance.submitSignedBeaconId(sig.v, sig.r, sig.s, {from: nodeAccount});
                addBeacon(event.args.uuid, major, minor).then( cb );  
            }
        } else cb(errors.validationError);
    }) 

}
exports.stopBeaconFilter = () =>  beaconFilter.stopWatching();
exports.startBeaconBroadcastRequestsFilter = startBeaconBroadcastRequestsFilter;

// --------------------------   Convenience Fns for Unit Tests  ---------------------

const _units = exports._units = {
    setDB: (db) => animistEvents = db
}
