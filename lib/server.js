
// ********************  This must run in its own process. **************************

'use strict'

// --------------------------------------- Imports -------------------------------------------------
// Local
let config = require('../lib/config')
const terminal = require('../lib/terminal')
const util = require('../lib/util')
const handlers = require('../lib/handlers')
const events = require('../lib/events')
const defaultCharacteristics = Object.keys(handlers.defs).map(key => handlers.defs[key]) // Generate array

// NPM
// Bleno has to be mocked for Travis CI because bluetooth dependencies
// aren't whitelisted -> tests crash w/ a seg fault

// let bleno = require('bleno');
let bleno = require('../test/mocks/bleno.js')
const Pouchdb = require('pouchdb')
const upsert = require('pouchdb-upsert')
const _ = require('lodash/array')

// -------------------------------------- Databases  -----------------------------------------------
Pouchdb.plugin(upsert)

let animistEvents = (!process.env.TRAVIS)
          ? new Pouchdb('http://localhost:5984/animistEvents')
          : new Pouchdb('animistEvents')

// ---------------------------------  Bleno Event Handlers -----------------------------------------
const onStateChange = function (state) {
  if (state === 'poweredOn') {
    bleno.startAdvertising(config.serverName, [this.service.uuid])
    terminal.start(this)
  } else {
    bleno.stopAdvertising()
  }
}

const onAdvertisingStart = function (err) {
  if (err) return

  return prepPublicationsOnLaunch()
    .then(res => this.updateBroadcast()
    .then(res => {
      events.startPresenceVerificationRequestsFilter(config.eventsContractAddress)
      events.startMessagePublicationRequestsFilter(config.eventsContractAddress, this.addPublication)
      terminal.advertising()
    }))
}

const onDisconnect = function (clientAddress) {
  util.resetPin()
}

// Question: Is this the rssi of the connected device?
// If so is there any relationship btw this reading and the
// beacon proximity reading on the phone? Issue #12. This
// is about whether we can independently verify proximity.
const onRssiUpdate = function () {}

// ----------------------------  Broadcasts  ----------------------------------

/**
 * Verifies that this uuid is NOT already being published.
 * @param  {String}  uuid v4 uuid formatted with dashes
 * @param  {Object}  args publication event args
 * @return {Boolean} true if uuid is not already being published, false otherwise
 */
const isUniqueUUID = function (uuid, args) {
  const compare = (obj) => obj.uuid === uuid
  return (_.findIndex(args, compare) === -1)
}

/**
 * Goes through publications in the animistEvents db on startup to remove any that have expired while
 * node was down. Sets new timeouts to remove publications as they expire while
 * whale-island is powered on.
 * @returns {Promise} Result of pouchDB gets/puts
 */
const prepPublicationsOnLaunch = function () {
  const now = Date.now()

  return animistEvents.get('publications')
    .then(doc => {
      _.remove(doc.list, item => now >= item.expires)
      doc.list.forEach(item => scheduleRemoval(item, item.expires - now))
      return animistEvents.put(doc)
    })
    .catch(e => Promise.resolve())
}

/**
 * Updates servers characteristics to include an endpoint which checks client authorization
 * to read message, responds with `message`, writes confirmation of the transmission to client contract
 * and disconnects. Sets a timeout to remove characteristic at date `expires`.
 * @param {Object}  args  `{ uuid: <string>, message: <string>, expires: <number>, contractAddress: <string> }`
 * @return {Promise} Result of DB gets/puts.
 */
const addPublication = function (args) {
  const list = []
  const duration = args.expires - Date.now()

  // Save to list of currently requested broadcasts and update broadcasts (if unique).
  return animistEvents.get('publications')
    .then(doc => {
      if (isUniqueUUID(args.uuid, doc.list)) {
        doc.list.push(args)
        return animistEvents.put(doc).then(res => {
          scheduleRemoval(args, duration)
          this.updateBroadcast()
        })
      }
    })
    .catch(() => {
      list.push(args)
      return animistEvents.put({ _id: 'publications', list: list }).then(res => {
        scheduleRemoval(args, duration)
        this.updateBroadcast()
      })
    })
}

/**
 * Removes an expired publication and updates the current broadcast
 * @param  {Object} pub      `{ characteristic: <bleno object>, expires: <date ms> }`
 * @param  {Number} duration ms before removal
 */
const scheduleRemoval = function (pub, duration) {
  setTimeout(() => {
    if (animistEvents) {
      animistEvents.get('publications')
        .then(doc => {
          _.remove(doc.list, item => item.uuid === pub.uuid)
          animistEvents.put(doc).then(updateBroadcast)
        })
        .catch( e => console.log(e))
    }
  }, duration)
}

/**
 * Resets service to include a new publication
 */
const updateBroadcast = function () {
  // Probably need to check if were connected here in an interval. . . .
  let characteristics = defaultCharacteristics.slice()

  // This suppresses unhandled rejection warnings from the units, where
  // Server is getting garbage collected post-timeout.  
  if (!this) return 

  return animistEvents.get('publications')
    .then(doc => {
      const publications = []

      doc.list.forEach(item => {
        const char = new bleno.Characteristic({uuid: item.uuid, properties: ['write']})
        char.onWriteRequest = handlers.generatePublicationHandler(item, char)
        publications.push(char)
      })

      characteristics = characteristics.concat(publications)
      this.service.characteristics = characteristics
      bleno.setServices([this.service])
    })
    .catch(() => {
      this.service.characteristics = characteristics
      bleno.setServices([this.service])
    })
}

// Convenience methods for unit tests
const _units = exports._units = {
  setDB: db => { animistEvents = db },
  mockEventsModule: () => {
    events.startMessagePublicationRequestsFilter = (a, b) => {}
    events.startPresenceVerificationRequestsFilter = (a) => {}
  },
  getEventsModule: () => events,
  suppressTerminal: () => { terminal.advertising = (a) => {} }
}

// --------------------------- Class: Animist Server ----------------------------------

class AnimistServer {

  constructor () {
    this.service = new bleno.PrimaryService({
      uuid: config.serverServiceId,
      characteristics: []
    })

    this.defaultCharacteristics = defaultCharacteristics
    this.addPublication = addPublication
    this.updateBroadcast = updateBroadcast

    this._units = {
      onAdvertisingStart: onAdvertisingStart.bind(this)
    }
  }

  // Set up listeners on launch
  start () {
    bleno.on('stateChange', onStateChange.bind(this))
    bleno.on('advertisingStart', onAdvertisingStart.bind(this))
    bleno.on('disconnect', onDisconnect.bind(this))
    bleno.on('rssiUpdate', onRssiUpdate.bind(this))
  }
};

// Export
module.exports = {
  AnimistServer: AnimistServer,
  addPublication: addPublication,
  updateBroadcast: updateBroadcast,
  prepPublicationsOnLaunch: prepPublicationsOnLaunch,
  isUniqueUUID: isUniqueUUID,
  _units: _units
}

// Shell Command:
// % node lib/server.js start
if (process.argv[2] === 'start') {
  new AnimistServer().start()
}

