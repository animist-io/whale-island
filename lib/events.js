'use strict'

/*
 * Filters for AnimistEvent contract events. Currently three possible requests:
 * + Verify presence of client
 * + Publish message on unique characteristic.
 * + Broadcast requestable beacon.
 */

// Local
const config = require('../lib/config.js')
const requestableBeacon = require('../lib/requestableBeacon')

// Ethereum
const Web3 = require('web3')
const util = require('ethereumjs-util')

// NPM
const Pouchdb = require('pouchdb')
const upsert = require('pouchdb-upsert')
const validator = require('validator')

// ------------------------------- Web3 Testing (test-rpc) -----------------------------------------
const network = 'http://localhost:8545'
const testRpc = new Web3.providers.HttpProvider(network)
const web3 = new Web3(testRpc)
const nodeAccount = web3.eth.accounts[0]

// ------------------------------------- Databases  ------------------------------------------------
Pouchdb.plugin(upsert)

let animistEvents = (!process.env.TRAVIS)
                    ? new Pouchdb('http://localhost:5984/animistEvents')
                    : new Pouchdb('animistEvents')

// -------------------------------------- Locals  --------------------------------------------------
let errors = config.events.filters
let presenceFilter
let msgFilter
let beaconFilter
// ------------------------------------- Utilities -------------------------------------------------

/**
 * Validates `expires` arg of a message publication event log. Duration must at least 1 sec and
 * smaller than the max value of uint32. Returns false if `expires` is before `Date.now()`.
 * @param  {BigNumber} expires date (ms since Epoch) that broadcast should end.
 * @return {Boolean} true if duration valid, false otherwise.
 */
const isValidExpirationDate = exports.isValidExpirationDate = function (expires) {
  // Verify that BN is within JS safety limits
  try {
    expires.toNumber()
  } catch (e) {
    return false
  }

  let duration = expires.toNumber() - Date.now()
  return (
    duration >= config.MIN_BROADCAST_DURATION &&
    duration <= config.MAX_BROADCAST_DURATION
  )
}

/**
 * Validates message arg of a message publication event log. Message must be non-null and
 * less than or equal to `config.MAX_MESSAGE_LENGTH`
 * @param  {String}  message
 * @return {Boolean} true if message is valid, false otherwise.
 */
const isValidMessage = exports.isValidMessage = function (message) {
  return (message.length > 0 && message.length <= config.MAX_MESSAGE_LENGTH)
}

/**
 * Validates message publication event data.
 * @param  {Object}  event `{ uuid: <uuid string>, message: <string>, expires: <date in ms> }`
 * @return {Boolean} true if data validates, false otherwise.
 */
const isValidMessagePublicationEvent = exports.isValidMessagePublicationEvent = function (event) {
  return (
    validator.isUUID(event.args.uuid) &&
    isValidMessage(event.args.message) &&
    isValidExpirationDate(event.args.expires)
  )
}

/**
 * Validates presence verification request event data
 * @param  {Objects}  event `{ account: <address>, contract: <address>}` }
 * @return {Boolean}  True if data validates, false otherwise.
 */
const isValidPresenceVerificationEvent = exports.isValidPresenceVerificationEvent = function (event) {
  return (
    util.isValidAddress(event.args.account) &&
    util.isValidAddress(event.args.contractAddress)
  )
}

/**
 * Retrieves last block for which an event was logged. This allows whale-island to synch its
 * events db to blockchain if it's been turned off without filtering for every event since
 * the node's genesis block
 * @param  {Object} db Event DB
 * @return {Number}    Block number
 * @return {Promise}   Result of db.get OR device genesis block if DB is new.
 */
const getLastSavedBlock = exports.getLastSavedBlock = function () {
  return animistEvents.get('lastBlock')
        .then(doc => doc.val)
        .catch(e => config.deviceGenesisBlock)
}

/**
 * Saves blocknumber of most recently logged event. This value serves as a starting point for the
 * events logs filters run by the `start. . .EventFilter` methods
 * @param  {Object} db Event DB
 * @param  {Number} block Current block number
 */
const saveBlock = exports.saveBlock = function (block) {
  return animistEvents.upsert('lastBlock', doc => {
    doc.val = block
    return doc
  })
}

/**
 * Adds a presenceVerification request to the animistEvents db. Does not allow duplicate clients.
 * @param {Object} event `{account: <address>, contractAddress: <address>}`
 */
const addPresenceVerificationRequest = exports.addPresenceVerificationRequest = function (event) {
  return animistEvents.put({
    _id: event.args.account,
    contractAddress: event.args.contractAddress
  })
}

/**
 * Generates a random value within the limits of allowed major and minor beacon values
 * @return {Number} a value between 0 and 65535 inclusive
 */
function generateRandom2ByteInt () {
  return Math.floor(Math.random() * (65535 - 0 + 1)) + 0
}

/**
 * Combines requested beacon uuid and randomly generated major and minor
 * values into a string with form: `<uuid>:<major>:<minor>`.
 * Signs this with the node account and formats it for
 * client's `submitSignedBeaconId` Solidity contract method
 * @param  {String} uuid  v4 uuid
 * @param  {Number} major Integer btw 0 and 65535
 * @param  {Number} minor Integer btw 0 and 65535
 * @return {Object}       EC sig obj that Solidity will parse correctly
 */
function generateBeaconSignature (uuid, major, minor) {
  let msg
  let msgHash
  let sig
  let signed = ''

  // safeSign pending resolution of testrpc signing bug.
  while (signed.length !== 132) {
    msg = uuid + ':' + major + ':' + minor
    msgHash = util.addHexPrefix(util.sha3(msg).toString('hex'))
    signed = web3.eth.sign(nodeAccount, msgHash)
  }
  sig = util.fromRpcSig(signed)

  // Covert to hex string for correct bytes32 translation
  sig.r = util.addHexPrefix(sig.r.toString('hex'))
  sig.s = util.addHexPrefix(sig.s.toString('hex'))
  return sig
}

// -------------------------------------------  Core -----------------------------------------------

/**
 * Starts filtering for presence verfication request events, from proximityEvents DB's
 * `lastBlock` to 'latest'. Validates event data, saves it and updates 'lastBlock' value to the
 * event's blockNumber.
 * @param  {String} eventsContractAddress   Address of the deployed AnimistEvents contract
 * @param  {Function} cb (Optional) Callback to execute when an event is logged and saved in the DB
 */
exports.startPresenceVerificationRequestsFilter = function (eventsContractAddress, cb) {
  // Instantiate Events contract
  let topic = {node: nodeAccount}
  let eventsContract = web3.eth.contract(config.eventsABI)
  eventsContract = eventsContract.at(eventsContractAddress)

  // Start filtering for and saving presence verfication requests
  getLastSavedBlock().then(last => {
    presenceFilter = eventsContract.LogPresenceVerificationRequest(topic, {fromBlock: last, toBlock: 'latest'})
    presenceFilter.watch((err, event) => {
      if (err) {
        console.log(errors.web3Error + err)
      } else if (isValidPresenceVerificationEvent(event)) {
        Promise.all([
          addPresenceVerificationRequest(event),
          saveBlock(event.blockNumber)
        ])
        .then(res => cb ? cb() : null)
        .catch(err => console.log(errors.dbError + err))
      } else {
        console.log(errors.validationError + JSON.stringify(event))
      }
    })
  })
}
exports.stopPresenceFilter = () => presenceFilter.stopWatching()

/**
 * Starts filtering for message publication request events. Validates event data and invokes
 * `server`'s addPublication method for each event.
 * @param  {String} eventsContractAddress   Address of the deployed AnimistEvents contract
 * @param  {Function} successCb             Success callback to pass event data to so server can cast it.
 * @param  {Function} errorCb               (Optional) Callback to execute when an event is logged.
 */
exports.startMessagePublicationRequestsFilter = function (eventsContractAddress, successCb, errorCb) {
  // Instantiate Events contract
  let topic = { node: nodeAccount }
  let eventsContract = web3.eth.contract(config.eventsABI)
  eventsContract = eventsContract.at(eventsContractAddress)

  getLastSavedBlock().then(last => {
    msgFilter = eventsContract.LogMessagePublicationRequest(topic, {fromBlock: last, toBlock: 'latest'})
    msgFilter.watch((err, event) => {
      if (err) {
        // Publish errors
      } else if (isValidMessagePublicationEvent(event)) {
        // Transform BN to int (okay b/c max broadcast duration is set to JS limit (32bytes))
        event.args.expires = event.args.expires.toNumber()
        successCb(event.args)
      } else errorCb ? errorCb(errors.validationError) : null
    })
  })
}
exports.stopMessageFilter = () => msgFilter.stopWatching()

/**
 * Starts filtering for beacon broadcast request events. Validates event data and invokes `server`'s
 * `addPublication` method for each event.
 * @param  {String} eventsContractAddress   Address of the deployed AnimistEvents contract
 * @param  {Function} addBeacon             Callback to pass event data to so beacon can cast it.
 * @param  {Function} cb                    (Optional) Callback to execute when an event is logged.
 */
exports.startBeaconBroadcastRequestsFilter = function (eventsContractAddress, addBeacon, cb) {
  // Setup & instantiate Events contract
  let now = web3.eth.blockNumber
  let topic = { node: nodeAccount }
  let eventsContract = web3.eth.contract(config.eventsABI)
  eventsContract = eventsContract.at(eventsContractAddress)

  beaconFilter = eventsContract.LogBeaconBroadcastRequest(topic, {fromBlock: now, toBlock: 'latest'})
  beaconFilter.watch((err, event) => {
    if (err) {
      console.log('ERROR: + err')
    } else if (validator.isUUID(event.args.uuid) && (event.blockNumber === web3.eth.blockNumber)) {
      // Generate beacon vals & sign beacon.
      let major = generateRandom2ByteInt()
      let minor = generateRandom2ByteInt()
      let sig = generateBeaconSignature(event.args.uuid, major, minor)

      // Instantiate client contract from address in event
      let clientContract = web3.eth.contract(config.methodsABI)
      let instance = clientContract.at(event.args.contractAddress)

      // Save signed beacon to client contract and queue beacon for broadcast
      if (instance) {
        instance.submitSignedBeaconId(sig.v, sig.r, sig.s, {from: nodeAccount})
        requestableBeacon.addBeacon(event.args.uuid, major, minor).then(cb)
      }
    } else cb(errors.validationError)
  })
}
exports.stopBeaconFilter = () => { beaconFilter.stopWatching(); beaconFilter = null }

// --------------------------   Convenience Fns for Unit Tests  ---------------------

exports._units = {
  setDB: (db) => { animistEvents = db }
}
