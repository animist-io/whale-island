'use strict'

// TO DO: rewrite pin  . . . .
// ----------------------------------- Imports -----------------------------------------
// Local
let config = require('../lib/config')
const eth = require('../lib/eth')
const pgpkey = require('../pgp/keystore.json')

// Ethereum
const util = require('ethereumjs-util')
const Transaction = require('ethereumjs-tx')

// Misc NPM
const rs = require('randomstring')
const openpgp = require('openpgp')

// ----------------------------------- Constants ---------------------------------------
const codes = config.codes
const TX_HASH_LENGTH = 0x42 // The Dalles.

// ----------------------------------- Locals ------------------------------------------

/**
 @var {bool} queueActive: flag to continue/finish getContract tranmission
 @var {Array} sendQueue: Array of type Buffer repr the contract to send
 @var {String} pin: 32 char alph-numeric random string that must be signed to access certain endpoints.
 @var {bool} clearPin: If true, a connection w/ a pin request has timed-out & pin will be cleared.
*/
let queueActive
let sendQueue = []
let pin = null
let clearPin = false

// ------------------------------ Decrypt PGP Key ----------------------------------
let privkey = pgpkey.privateKeyArmored
privkey = openpgp.key.readArmored(privkey)
privkey.keys[0].decrypt(config.pgpPassphrase) // ****** DEVELOPMENT ONLY *************
privkey = privkey.keys[0]

// ----------------------------------- PGP --------------------------------------------

/**
 * Decrypts a PGP encrypted message
 * @param  {String} encrypted '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'
 * @return {Promise} Resolves a decrypted message or rejects.
 */
const decrypt = function (encrypted) {
  try {
    const msg = openpgp.message.readArmored(encrypted)
    return msg.decrypt(privkey).then(decrypted => decrypted.getText())
  } catch (e) {
    return Promise.reject()
  }
}

/**
 * Encrypts a plaintext message with whale-island's public key. (for unit tests)
 * @param  {String} data      plain text
 * @param  {String} publicKey '-----BEGIN PGP PUBLIC KEY BLOCK ... END PGP PUBLIC KEY BLOCK-----'
 * @return {Promise} Resolve an encrypted string or rejects.
 */
const encrypt = function (data) {
  try {
    const options = {
      data: data,
      publicKeys: openpgp.key.readArmored(config.publicKey).keys[0]
    }
    return openpgp.encrypt(options).then(cipher => cipher.data)
  } catch (e) {
    return Promise.reject()
  }
}

// ----------------------------------- PIN --------------------------------------------
/**
 * Gets pin. Blockchain writes and presence verifications require the mobile client to
 * sign this value w/the account they're executing txs with. Pin is generated anew for
 * each connection and all endpoints except this one automatically disconnect from the client
 * at the earliest opportunity. After getting the pin mobile clients must make another endpoint
 * call within config.PIN_RESET_INTERVAL or their session will timeout.
 * The pin helps to mitigate risks from MITM attack vectors and provides a way for clients to prove
 * their identity.
 * @method  getPin
 * @param {Boolean} generateNew If true, generates a new pin and sets a timeout to clear it.
 * @return {String} pin: A 32 character alpha-numeric *random* value.
 */
const getPin = function (generateNew) {
  if (generateNew) {
    pin = rs.generate()
    clearPin = true
    setTimeout(() => (clearPin) ? resetPin() : null, config.PIN_RESET_INTERVAL)
    return pin
  // Keep connection alive
  } else {
    clearPin = false
    return pin
  }
}

/**
 Generates a new pin. Keeps track of old pin until next reset.
 @method resetPin
*/
const resetPin = function () {
  pin = null
  clearPin = false
}

// ----------------------------------- Packet Queue ---------------------------------------
/**
 * DeQueues a packet from the send queue. Used when transmitting
 * messages like contract code which exceed the maximum msg length for BLE for
 * a given mobile platform.
 * @method  deQueue
 * @return {Buffer} packet: Part of a queued messsage.
 */
const dequeue = () => sendQueue.shift()
/**
 * Gets queue state
 * @return {Boolean} state active (`true`) OR inactive (`false`).
 */
const isQueueActive = () => queueActive
/**
 * Gets number of packets remaining to send.
 * @method queueLength
 * @return {Number} length
 */
const queueLength = () => sendQueue.length
/**
 * Sets flag to begin multi-packet message send
 * @method  activateQueue
 */
const activateQueue = () => { queueActive = true }
/**
 * Unsets multi-packet message send flag
 * @method  deactivateQueue
 */
const deactivateQueue = () => { queueActive = false }

/**
 Converts a tx object into an array of buffers whose largest size is MAX_SEND
 - e.g. the maximum number of bytes that can be sent in a packet.
 @method queueContract
 @param {Object} code:
*/
const queueContract = function (_tx) {
  let start = 0
  let end = 0
  const tx = JSON.stringify(_tx)
  const out = new Buffer(tx)

  sendQueue = []

  for (let i = 0; i < out.length; i += config.MAX_SEND) {
    ((out.length - start) < config.MAX_SEND)
      ? end = start + (out.length - start)
      : end = end + config.MAX_SEND

    if (start !== end) {
      sendQueue.push(out.slice(start, end))
      start = end
    }
  }
}

// ----------------------------------- Parsers ---------------------------------------

/**
 Retrieves pin from incoming data as string or eth-lightwallet object.
 @method extractPinFromJSON
 @param {String} data: JSON formatted string or object
 @return {(String|Object)} signedPin: returns null on error.
*/
const extractPinFromJSON = function (data) {
  try {
    let parsed = JSON.parse(data)

    // Case: data has form { pin: {object} or string, tx: {object} }
    if (parsed.hasOwnProperty('pin') && (typeof parsed.pin === 'string' || typeof parsed.pin === 'object')) {
      return parsed.pin

    // Case: data is string or eth-lightwallet object
    } else if (typeof parsed === 'string' || typeof parsed === 'object') {
      return parsed

    // Case: data unknown
    } else {
      return null
    }
  } catch (e) {
    return null
  }
}

/**
 Validates format of signedPin
 @method parseSignedPin
 @param {String} data: JSON formatted signed string OR an object with v,r,s fields.
 @returns {Object} parsed:  `{ ok: boolean status, val: signed pin OR hex error code }`
*/
const parseSignedPin = function (data) {
  const parsed = extractPinFromJSON(data)

  if (parsed) {
    // Check for & re-buffer eth-lightwallet signing format
    if (parsed.hasOwnProperty('r') && parsed.hasOwnProperty('s') && parsed.hasOwnProperty('v')) {
      parsed.r = new Buffer(parsed.r.data)
      parsed.s = new Buffer(parsed.s.data)
      return {ok: true, val: parsed}

    // Check for web3 signing format
    } else if (typeof parsed === 'string' && util.isHexPrefixed(parsed)) {
      return { ok: true, val: parsed }

    // Failed
    } else {
      return { ok: false, val: codes.NO_SIGNED_MSG_IN_REQUEST }
    }

  // JSON formatting failure catch
  } else return { ok: false, val: codes.INVALID_JSON_IN_REQUEST }
}

/**
 Checks that signed tx object is valid - i.e. that it was signed by the same sender
 that signed the pin, that the signature verifies and tx's gas limit is sufficient.
 @method parseSignedTx
 @param {String} data: JSON formatted signed transaction object
 @param {String} client: hex prefixed address extracted from pin signing
 @return {Object} parsed: `{ok: <boolean>, val: <tx string> or <hex error code> }`
*/
const parseSignedTx = function (data, client) {
  try {
    const parsed = JSON.parse(data)

    if (typeof parsed !== 'object' || !parsed.hasOwnProperty('tx') || typeof parsed.tx !== 'string') {
      return { ok: false, val: codes.INVALID_JSON_IN_REQUEST }
    }

    let decodedTx = util.rlp.decode(util.addHexPrefix(parsed.tx))
    decodedTx = new Transaction(decodedTx)
    let txAddress = util.addHexPrefix(decodedTx.getSenderAddress().toString('hex'))

    // Content error checks
    if (txAddress !== client) {
      return { ok: false, val: codes.INVALID_TX_SENDER_ADDRESS }
    } else if (!decodedTx.validate()) {
      return { ok: false, val: codes.INSUFFICIENT_GAS }
    } else {
      return { ok: true, val: parsed.tx }
    }
   // Unknown parse failure.
  } catch (err) {
    return { ok: false, val: codes.INVALID_JSON_IN_REQUEST }
  }
}

/**
 Verifies that JSON input has minimum formal properties of tx hash and returns hash as string.
 @method parseTxHash
 @returns {Object} parsed: `{ ok: <boolean>, val: <txHash string> OR <hex error code> }`
*/
const parseTxHash = function (data) {
  try {
    const parsed = JSON.parse(data)
    return (typeof parsed === 'string' && util.isHexPrefixed(parsed) && parsed.length === TX_HASH_LENGTH)
      ? { ok: true, val: parsed }
      : { ok: false, val: codes.INVALID_TX_HASH }
  } catch (e) {
    return { ok: false, val: codes.INVALID_TX_HASH }
  }
}

/**
 * Parses call data string into object that can be given as param to web3.eth.call
 * @method parseCall
 * @param {String} data: JSON formatted string repr. array (len 2) of hex prefixed strings.
 * @returns {Object} `{ ok: true, val: {to: '0xee9..f', data: '0x34d..a'}`
 * @returns {Object} `{ ok: false, val: 0x11 }` on error
 */
const parseCall = function (data) {
  try {
    const isHex = util.isHexPrefixed
    const parsed = JSON.parse(data)

    return (typeof parsed === 'object' && isHex(parsed[0]) && isHex(parsed[1]))
      ? { ok: true, val: {to: parsed[0], data: parsed[1]} }
      : { ok: false, val: codes.INVALID_CALL_DATA }
  } catch (e) {
    return { ok: false, val: codes.INVALID_CALL_DATA }
  }
}

/**
 * Parses call data string into object that can be given as param to web3.eth.call
 * @method parseAddress
 * @param {String} data: JSON formatted string account address (must be hex prefixed)
 * @returns {Object} `{ ok: true, val: '0xabc3..567' }`
 * @returns {Object} `{ ok: false, val: 0x05 }` on error
 */
const parseAddress = function (data) {
  try {
    const parsed = JSON.parse(data)

    return (typeof parsed === 'string' && util.isValidAddress(parsed))
      ? { ok: true, val: parsed }
      : { ok: false, val: codes.NO_TX_ADDR_ERR }
  } catch (e) {
    return { ok: false, val: codes.INVALID_JSON_IN_REQUEST }
  }
}

/**
 * Checks that client does NOT have a pending presenceVerification request.
 * @param  {String} client: callers address
 * @param  {String} tx: signed transaction
 * @return {Promise} Resolves
 * @return {Promise} Rejects w/  `{ok: false, val: <hex error code> }`
 */
const canSendTx = function (client) {
  // Only reject if pending - non-existent record is fine.
  return new Promise((resolve, reject) => {
    eth.db().get(client)
      .then(doc => (doc.verifyPresenceStatus === 'pending')
          ? reject({ ok: false, val: codes.TX_PENDING })
          : resolve()
      )
      .catch(resolve)
  })
}

// ------------------------ Convenience Methods for Unit Tests --------------------------
const _units = {
  getSendQueue: () => sendQueue,
  resetSendQueue: () => { sendQueue = [] },
  setSessionLength: length => { config.SESSION_LENGTH = length },
  setPinResetInterval: length => { config.PIN_RESET_INTERVAL = length }
}

/**
 * getPin that returns a fixed value - pending resolution of testrpc bug documented at
 * `https://github.com/ethereumjs/testrpc/issues/190` (For unit testing).
 */
const getPinSafe = function (generateNew) {
  if (generateNew) {
    pin = 'HGWz67rYyDYiX3cADWVtyz5LMcUQnAFe'
    clearPin = true

    setTimeout(() => {
      if (clearPin) {
        resetPin()
      }
    }, config.PIN_RESET_INTERVAL)

    return pin

  // Keep connection alive
  } else {
    clearPin = false
    return pin
  }
}

// ------------------------ Convenience Methods for Unit Tests --------------------------
module.exports = {
  decrypt: decrypt,
  encrypt: encrypt,
  getPin: getPin,
  getPinSafe: getPinSafe,
  resetPin: resetPin,
  dequeue: dequeue,
  queueLength: queueLength,
  activateQueue: activateQueue,
  deactivateQueue: deactivateQueue,
  isQueueActive: isQueueActive,
  queueContract: queueContract,
  parseSignedPin: parseSignedPin,
  parseSignedTx: parseSignedTx,
  parseTxHash: parseTxHash,
  parseCall: parseCall,
  parseAddress: parseAddress,
  extractPinFromJSON: extractPinFromJSON,
  canSendTx: canSendTx,
  _units: _units
}

