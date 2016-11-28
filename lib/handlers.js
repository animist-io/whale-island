'use strict'

// --------------------------------------- Imports -------------------------------------------------
// Local
let config = require('../lib/config')
let eth = require('../lib/eth')
const util = require('../lib/util')

// Bleno:  Has to be mocked for Travis CI because bluetooth dependencies aren't whitelisted
// const bleno = require('bleno');
const bleno = require('../test/mocks/bleno.js')

// -------------------------------------- Constants ------------------------------------------------
const codes = config.codes

// ---------------------------------------- Util ---------------------------------------------------
/**
 * JSONifies message, responds w/ hex code 0x00 (success) via bleno callback, runs
 * updateValueCallback call to send message in a 50ms timeout and finally, forces client
 * disconnect
 * @param  {Object} updater Bleno characteristic to call updateValueCallback on
 * @param  {[type]} msg     Message to send
 */
const respondAndDisconnect = function (characteristic, callback, _msg) {
  const msg = new Buffer(JSON.stringify(_msg))
  callback(codes.RESULT_SUCCESS)
  setTimeout(() => {
    characteristic.updateValueCallback(msg)
    bleno.disconnect()
  }, 50)
}

/**
 * Responds w/ hex code error via bleno callback and forces client disconnect
 * @param  {Function} callback Bleno initial hex response cb
 * @param  {[type]}   msg      Hex error code
 */
const errorAndDisconnect = function (callback, msg) {
  callback(msg)
  bleno.disconnect()
}
// --------------------------------- Characteristic Handlers ---------------------------------------

/**
 Generates a new 'pin' value. A signed copy of the pin is required to access server
 endpoints that execute transactions on the blockchain or request account-specific data from it.
 Pin signing verifies that the mobile client connecting to whale-island controls the private key for
 the transacting account. Pin is valid while the connection is open. Connection will automatically
 close if client does not make a request to one of the pin enabled endpoints within
 config.PIN_RESET_INTERVAL ms. This token also mitigates an MITM attack vector for state-changing
 transactions, where someone could sniff the encrypted packet and try to resend it.

 @property {Characteristic} Read C40C94B3-D9FF-45A0-9A37-032D72E423A9
 @property {Public} Access
 @property {No} Encrypted
 @method onGetPin
 @param callback Hex code `0x00` on success
 @returns {Buffer} JSON formatted 32 character alpha-numeric string (resets every ~30 sec)
*/
const onGetPin = function (offset, callback) {
  const pin = util.getPin(true)
  callback(codes.RESULT_SUCCESS, new Buffer(pin))
}

/**
 Publishes node's public account number.
 @property {Characteristic} Read 1FD26CCA-EA2B-4B9E-A59E-17AA7E61A0AC
 @property {Public} Access
 @property {No} Encrypted
 @method onGetDeviceAccount
 @param callback Hex code `0x00` on success
 @returns {Buffer} JSON formatted hex prefixed account address
 */
const onGetDeviceAccount = function (offset, callback) {
  const account = JSON.stringify(config.animistAccount)
  callback(codes.RESULT_SUCCESS, new Buffer(account))
  bleno.disconnect()
}

/**
 Publishes current blockNumber.
 @property {Characteristic} Read C888866C-3499-4B80-B145-E1A61620F885
 @property {Public} Access
 @property {No} Encrypted
 @method onGetBlockNumber
 @param callback Hex code `0x00` on success
 @returns {Buffer} JSON formatted string: `"152..2"`
*/
const onGetBlockNumber = function (offset, callback) {
  const block = JSON.stringify(eth.getBlockNumber())
  callback(codes.RESULT_SUCCESS, new Buffer(block))
  bleno.disconnect()
}

/**
 Publishes a PGP keyID that can be used to fetch the nodes public PGP key from 'https://pgp.mit.edu'.
 @property {Characteristic} Read 75C06966-FEF2-4B23-A5AE-60BA8A5C622C
 @property {Public} Access
 @property {No} Encrypted
 @method onGetPgpKeyId
 @param callback Hex code `0x00` on success
 @returns {Buffer} JSON formatted string: `'32e6aa. . .4f922'`
*/
const onGetPgpKeyId = function (offset, callback) {
  const keyId = JSON.stringify(config.pgpKeyId)
  callback(codes.RESULT_SUCCESS, new Buffer(keyId))
  bleno.disconnect()
}

/**
 Responds w/ small subset of web3 data about a transaction. Useful for determining whether
 or not a transaction has been mined. (blockNumber field of response will be null if tx is
 pending)
 @property {Characteristic} Subscribe 03796948-4475-4E6F-812E-18807B28A84A
 @property {Public} Access
 @property {No} Encrypted
 @method onGetTxStatus
 @param {Buffer} data: JSON formatted tx hash (hex prefixed)
 @param {Buffer} callback: initial response is hex code: `0x00` on success or hex err.
 @returns {Buffer} JSON formatted object `{ blockNumber: "150..1", nonce: "77", gas: "314..3" }`
 @returns {Buffer} JSON formatted null value on error.
*/
const onGetTxStatus = function (data, offset, response, callback) {
  const self = defs.getTxStatusCharacteristic
  const req = util.parseTxHash(data)

  if (req.ok) {
    eth.getTx(req.val)
      .then(txStatus => respondAndDisconnect(self, callback, txStatus))
      .catch(e => respondAndDisconnect(self, callback, null))
  } else {
    errorAndDisconnect(callback, req.val)
  }
}

/**
 Responds w/ wei balance of requested account.
 @property {Characteristic} Subscribe A85B7044-F1C5-43AD-873A-CF923B6D62E7
 @property {Public} Access
 @property {No} Encrypted
 @method onGetAccountBalance
 @param {Buffer} data: JSON formatted hex prefixed account address
 @param {Buffer} callback: initial response is hex code: `0x00` on success or hex err.
 @returns {Buffer} JSON formatted string: wei value.
 @returns {Buffer} JSON formatted string: "0" on error.
*/
const onGetAccountBalance = function (data, offset, response, callback) {
  const self = defs.getAccountBalanceCharacteristic
  const req = util.parseAddress(data)

  if (req.ok) {
    const balance = eth.getAccountBalance(req.val)
    respondAndDisconnect(self, callback, balance)
  } else {
    errorAndDisconnect(callback, req.val)
  }
}

/**
 Returns data that can be used to authenticate client's proximity to the node.
 Response includes a timestamp, the timestamp signed by the node account, and the caller's
 address signed by the node account (using web3.sign). Useful if you wish implement your own
 presence verification strategy in contract code and can run an ethereum light-client on your
 client's device, or have a server that can independently validate this data.
 @property {Characteristic} Subscribe BA2C3091-DAB8-4D51-BF92-3A6F023E9AD7
 @property {Pin} Access signed by caller account.
 @method onGetPresenceReceipt
 @param {Buffer} data: JSON formatted pin value, signed by caller account.
 @param {Buffer} callback: initial response is hex code: `0x00` on success or err.
 @returns {Buffer} JSON obj: `{time: '1453..9', signedTime: '0xaf..9e', signedAddress: '0x32..ae'}`
 @returns {Buffer} JSON formatted null value on error.
*/
const onGetPresenceReceipt = function (data, offset, response, callback) {
  const pin = util.getPin()
  const self = defs.getPresenceReceiptCharacteristic
  const req = util.parseSignedPin(data)

  if (req.ok) {
    const receipt = eth.getPresenceReceipt(pin, req.val)
    respondAndDisconnect(self, callback, receipt)
  } else {
    errorAndDisconnect(callback, req.val)
  }
}

/**
 Returns status data about both of the transactions that are executed in a verifyPresenceAndSendTx
 request. (Whale-island waits for the presence verification request to mined before it sends the
 client transaction - this endpoint provides a way of retrieving it) Response includes info about
 the presence verification tx which may be 'pending' or 'failed', the presence verification tx hash
 (verifyPresenceTxHash) and the client's sent tx hash (clientTxHash), if available.
 @property {Characteristic} Subscribe 421522D1-C7EE-494C-A1E4-029BBE644E8D
 @property {Pin} Access signed by caller account.
 @property {No} Encrypted
 @method onGetClientTxStatus
 @param {Buffer} data: JSON formatted pin value, signed by caller account.
 @param {Buffer} callback: initial response is hex code . 0x00 on success or err.
 @returns {Buffer} JSON obj.
 `{verifyPresenceStatus: "success", verifyPresenceTxHash: "0x7d..3", clientTxHash: "0x32..e" }`
 @returns {Buffer} JSON formatted null value on error.
*/
const onGetClientTxStatus = function (data, offset, response, callback) {
  let clientTxStatus = {}
  const pin = util.getPin()
  const self = defs.getClientTxStatusCharacteristic
  const req = util.parseSignedPin(data)

  if (req.ok) {
    const client = eth.recover(pin, req.val)
    eth.db().get(client)
      .then(doc => {
        clientTxStatus.verifyPresenceStatus = doc.verifyPresenceStatus
        clientTxStatus.verifyPresenceTxHash = doc.verifyPresenceTxHash
        clientTxStatus.clientTxHash = doc.clientTxHash
        respondAndDisconnect(self, callback, clientTxStatus)
      })
      .catch(e => respondAndDisconnect(self, callback, null))
  } else {
    errorAndDisconnect(callback, req.val)
  };
}

/**
 * Returns `address` of the contract which requested presence verification services for the mobile
 * client at this node. Caller can use this to fetch contract code from their own Ethereum light
 * client or from a public Ethereum node like Infura and then generate signed rawTransactions and
 * publish them via whale-island (or elsewhere).
 * @property {Characteristic} Subscribe 007A62CC-068F-4E85-898E-7EA98AD4E31B
 * @property {Pin} Access signed by caller account.
 * @property {No} Encrypted
 * @method onGetContractAddress
 * @param {Buffer} data: JSON formatted pin value, signed by mobile client account.
 * @param {Buffer} callback: initial response is hex code: `0x00` on success or err.
 * @returns {Buffer} JSON formatted string (address): `0x4f3e..a1`
*/
const onGetContractAddress = function (data, offset, response, callback) {
  const self = defs.getContractAddressCharacteristic
  const pin = util.getPin()
  const req = util.parseSignedPin(data)

  if (req.ok) {
    eth.getContractAddress(pin, req.val)
      .then(address => respondAndDisconnect(self, callback, address))
      .catch(err => errorAndDisconnect(callback, err))
  } else {
    errorAndDisconnect(callback, req.val)
  }
}

/**
 * Returns `code` and `address` of the contract which requested presence verification services for
 * the mobile client at this node. Caller can use this to generate signed rawTransactions and
 * publish them via whale-island (or elsewhere). This is a lot of data so it gets sent in a series
 * of packets. onGetContractIndicate handler publishes these as the client signals it can accept
 * more.)
 * @property {Characteristic} Subscribe BFA15C55-ED8F-47B4-BD6A-31280E98C7BA
 * @property {Pin} Access signed by caller account.
 * @property {No} Encrypted
 * @method onGetContract
 * @param {Buffer} data: JSON formatted pin value, signed by mobile client account.
 * @param {Buffer} callback: initial response is hex code: `0x00` on success or err.
 * @returns {Buffer} JSON formatted object: `{contractAddress: "0x4f3e..a1" code: "0x5d3e..11"}`,
*/
const onGetContract = function (data, offset, response, callback) {
  const self = defs.getContractCharacteristic
  const pin = util.getPin()
  const req = util.parseSignedPin(data)

  if (req.ok) {
    eth.getContract(pin, req.val)
      .then(contract => {
        util.activateQueue()
        util.queueContract(contract)
        callback(codes.RESULT_SUCCESS)
        setTimeout(() => self.updateValueCallback(util.dequeue()), 50)
      })
      .catch(err => errorAndDisconnect(callback, err))
  } else {
    errorAndDisconnect(callback, req.val)
  }
}

/**
 dequeues and sends contract code packet.
 @method onGetContractIndicate
 @property {Automatic} Access following onGetContract call
 @property {No} Encrypted
 @returns {Buffer} data: queued packet of JSON formatted contract object. (see onGetContract)
 @returns {Buffer} JSON formatted string "EOF" after last packet is sent.
*/
const onGetContractIndicate = function () {
  const self = defs.getContractCharacteristic
  const eof = new Buffer(codes.EOF)

  if (util.isQueueActive()) {
    if (util.queueLength()) {
      setTimeout(() => self.updateValueCallback(util.dequeue()))
    } else {
      util.deactivateQueue()
      setTimeout(() => self.updateValueCallback(eof))
    }
    // After EOF
  } else bleno.disconnect()
}

/**
 * Executes web3.eth.call on public constant contract methods that use no gas and do not need to be signed.
 * This endpoint is useful if you wish to retrieve data 'synchronously' from a contract.
 * @property {Characteristic} Subscribe 4506C117-0A27-4D90-94A1-08BB81B0738F
 * @property {Public} Access
 * @property {No} Encrypted
 * @method onCallMethod
 * @param {Buffer} data: JSON formatted array repr. "to" and "data" fields of web3 call:
 *                       `["0x84..e", "0x453e..f"]`
 * @param {Buffer} callback: initial response is hex code . 0x00 on success or err.
 * @returns {Buffer} JSON formatted string of web3.eth.call result.
*/
const onCallTx = function (data, offset, response, callback) {
  const self = defs.callTxCharacteristic
  const parsed = util.parseCall(data)

  if (parsed.ok) {
    const callResult = eth.callTx(parsed.val)
    respondAndDisconnect(self, callback, callResult)
  } else {
    errorAndDisconnect(callback, parsed.val)
  }
}

/**
 * Sends tx as rawTransaction. Will not submit if a pending verifyPresenceAndSend request exists
 * in the contractDB for this caller account. (This endpoint is intended primarily as a convenience
 * for processing arbitrary method calls including contract deployments and payments.)
 * @property {Characteristic} Subscribe 3340BC2C-70AE-4E7A-BE24-8B2ED8E3ED06
 * @property {Pin} Access
 * @property {Yes} Encrypted
 * @method onSendTx
 * @param {Object} encrypted: Encrypted, signed method call and pin `{tx: "0x123d..", pin: {v: r: s: }}`
 * @param {Buffer} callback: initial response is hex code: `0x00` on success or err.
 * @returns {Buffer} txHash:
*/
const onSendTx = function (encrypted, offset, response, callback) {
  const pin = util.getPin()
  const self = defs.sendTxCharacteristic

  util.decrypt(encrypted).then(data => {
    const parsedPin = util.parseSignedPin(data)
    const client = eth.recover(pin, parsedPin.val)
    const parsedTx = util.parseSignedTx(data, client)

    if (parsedPin.ok && parsedTx.ok) {
      util.canSendTx(client)
        .then(() => {
          const txHash = eth.sendTx(parsedTx.val)
          respondAndDisconnect(self, callback, txHash)
        })
        // Maybe this shouldn't be a catch. eth.sendTx could throw.
        .catch(err => errorAndDisconnect(callback, err.val))
    } else {
      (parsedPin.ok)
        ? errorAndDisconnect(callback, parsedTx.val)
        : errorAndDisconnect(callback, parsedPin.val)
    }
  }).catch(e => errorAndDisconnect(callback, codes.DECRYPTION_FAILED))
}

/**
 Authenticates client's proximity to node by invoking their contract's "verifyPresence"
 method with the node account.
 @method onVerifyPresence
 @property {Characteristic} Subscribe 297E3B0A-F353-4531-9D44-3686CC8C4036
 @property {Pin} Access signed by caller account.
 @property {Yes} Encrypted
 @param {Buffer} encrypted: encrypted JSON pin value, signed by caller account.
 @param {Buffer} callback: initial response is hex code . 0x00 on success or err.
 @returns {Buffer} JSON formatted string verifyPresence tx hash.
 @returns {Buffer} JSON formatted null value on error.
*/
const onVerifyPresence = function (encrypted, offset, response, callback) {
  const self = defs.verifyPresenceCharacteristic
  const pin = util.getPin()

  util.decrypt(encrypted).then(data => {
    const parsedPin = util.parseSignedPin(data)

    if (parsedPin.ok) {
      eth.verifyPresence(pin, parsedPin.val)
        .then(txHash => respondAndDisconnect(self, callback, txHash))
        .catch(e => respondAndDisconnect(self, callback, null))
    } else {
      errorAndDisconnect(callback, parsedPin.val)
    }
  }).catch(e => errorAndDisconnect(callback, codes.DECRYPTION_FAILED))
}

/**
 Authenticates client's proximity to node by invoking their contract's "verifyPresence"
 method with the node account. Waits for verifyPresence tx to be mined and sends clients raw transaction.
 This endpoint provides a way of authenticating and sending a transaction in a single step.
 @property {Characteristic} Subscribe 8D8577B9-E2F0-4750-BB82-421750D9BF86
 @property {Pin} Access signed by caller account.
 @property {Yes} Encrypted
 @param {Buffer} encrypted: Encrypted JSON obj `{ pin: {v: r: s:}, tx: "0x32a..2d" }`
 @param {Buffer} callback: initial response is hex code: `0x00` on success or err.
 @returns {Buffer} JSON formatted string: tx hash of verifyPresence method call
 @returns {Buffer} JSON formatted null on error.
*/
const onVerifyPresenceAndSendTx = function (encrypted, offset, response, callback) {
  const pin = util.getPin()
  const self = defs.verifyPresenceAndSendTxCharacteristic

  util.decrypt(encrypted).then(data => {
    const parsedPin = util.parseSignedPin(data)
    const client = eth.recover(pin, parsedPin.val)
    const parsedTx = util.parseSignedTx(data, client)

    if (parsedPin.ok && parsedTx.ok) {
      eth.verifyPresence(pin, parsedPin.val)
        .then(txHash => {
          eth.sendTxWhenPresenceVerified(txHash, parsedTx.val, client)
          respondAndDisconnect(self, callback, txHash)
        })
        .catch(e => respondAndDisconnect(self, callback, null))
    } else {
      (parsedPin.ok)
        ? errorAndDisconnect(callback, parsedTx.val)
        : errorAndDisconnect(callback, parsedPin.val)
    }
  }).catch(e => errorAndDisconnect(callback, codes.DECRYPTION_FAILED))
}

/**
 * Generates a request handler for message Publications commisioned by contract.
 * @param  {Object} args   Event args from a requestMessagePublication event
 * @param  {Object} self   Bleno characteristic obj. this handler will be attached to.
 * @return {Function}      Write request handler
 */
const generatePublicationHandler = function (_args, _self) {
  const args = Object.assign({}, _args)
  const self = Object.assign({}, _self)

  return function (data, offset, response, callback) {
    const pin = util.getPin()
    const req = util.parseSignedPin(data)
    const isAuthorized = eth.isAuthorizedToReadMessage(args, req.val)

    if (req.ok && isAuthorized) {
      const client = eth.recover(pin, req.val)
      eth.confirmMessageDelivery(args, client)
      respondAndDisconnect(self, callback, args.message)
    } else {
      (!req.ok)
        ? errorAndDisconnect(callback, req.val)
        : errorAndDisconnect(callback, codes.NOT_AUTHORIZED)
    }
  }
}

// ----------------  Characteristic Defs ---------------------------

const verifyPresenceCharacteristic = new bleno.Characteristic({
  uuid: config.characteristicUUIDS.verifyPresence,
  properties: ['write'],
  onWriteRequest: onVerifyPresence
})

const verifyPresenceAndSendTxCharacteristic = new bleno.Characteristic({
  uuid: config.characteristicUUIDS.verifyPresenceAndSendTx,
  properties: ['write'],
  onWriteRequest: onVerifyPresenceAndSendTx
})

const callTxCharacteristic = new bleno.Characteristic({
  uuid: config.characteristicUUIDS.callTx,
  properties: ['write'],
  onWriteRequest: onCallTx
})

const sendTxCharacteristic = new bleno.Characteristic({
  uuid: config.characteristicUUIDS.sendTx,
  properties: ['write'],
  onWriteRequest: onSendTx
})

const getPinCharacteristic = new bleno.Characteristic({
  uuid: config.characteristicUUIDS.getPin,
  properties: ['read'],
  onReadRequest: onGetPin
})

const getDeviceAccountCharacteristic = new bleno.Characteristic({
  uuid: config.characteristicUUIDS.getDeviceAccount,
  properties: ['read'],
  onReadRequest: onGetDeviceAccount
})

const getBlockNumberCharacteristic = new bleno.Characteristic({
  uuid: config.characteristicUUIDS.getBlockNumber,
  properties: ['read'],
  onReadRequest: onGetBlockNumber
})

const getPgpKeyIdCharacteristic = new bleno.Characteristic({
  uuid: config.characteristicUUIDS.getPgpKeyId,
  properties: ['read'],
  onReadRequest: onGetPgpKeyId
})

const getAccountBalanceCharacteristic = new bleno.Characteristic({
  uuid: config.characteristicUUIDS.getAccountBalance,
  properties: ['write'],
  onReadRequest: onGetAccountBalance
})

const getTxStatusCharacteristic = new bleno.Characteristic({
  uuid: config.characteristicUUIDS.getTxStatus,
  properties: ['write'],
  onWriteRequest: onGetTxStatus
})

const getContractCharacteristic = new bleno.Characteristic({
  uuid: config.characteristicUUIDS.getContract,
  properties: ['write', 'indicate'],
  onWriteRequest: onGetContract,
  onIndicate: onGetContractIndicate
})

const getContractAddressCharacteristic = new bleno.Characteristic({
  uuid: config.characteristicUUIDS.getContractAddress,
  properties: ['write'],
  onWriteRequest: onGetContractAddress
})

const getClientTxStatusCharacteristic = new bleno.Characteristic({
  uuid: config.characteristicUUIDS.getClientTxStatus,
  properties: ['write'],
  onWriteRequest: onGetClientTxStatus
})

const getPresenceReceiptCharacteristic = new bleno.Characteristic({
  uuid: config.characteristicUUIDS.getPresenceReceipt,
  properties: ['write'],
  onWriteRequest: onGetPresenceReceipt
})

const defs = {
  verifyPresenceCharacteristic: verifyPresenceCharacteristic,
  verifyPresenceAndSendTxCharacteristic: verifyPresenceAndSendTxCharacteristic,
  sendTxCharacteristic: sendTxCharacteristic,
  callTxCharacteristic: callTxCharacteristic,
  getPinCharacteristic: getPinCharacteristic,
  getDeviceAccountCharacteristic: getDeviceAccountCharacteristic,
  getBlockNumberCharacteristic: getBlockNumberCharacteristic,
  getAccountBalanceCharacteristic: getAccountBalanceCharacteristic,
  getTxStatusCharacteristic: getTxStatusCharacteristic,
  getContractCharacteristic: getContractCharacteristic,
  getContractAddressCharacteristic: getContractAddressCharacteristic,
  getClientTxStatusCharacteristic: getClientTxStatusCharacteristic,
  getPresenceReceiptCharacteristic: getPresenceReceiptCharacteristic,
  getPgpKeyIdCharacteristic: getPgpKeyIdCharacteristic
}

const _units = {
  setEth: mockEth => {
    eth.isAuthorizedToReadMessage = mockEth.isAuthorizedToReadMessage
    eth.confirmMessageDelivery = mockEth.confirmMessageDelivery
  },
  getEth: () => eth
}

// ---------------------------------- Export --------------------------------------------
module.exports = {
  defs: defs,
  _units: _units,
  onGetPin: onGetPin,
  onGetDeviceAccount: onGetDeviceAccount,
  onGetBlockNumber: onGetBlockNumber,
  onGetPgpKeyId: onGetPgpKeyId,
  onGetAccountBalance: onGetAccountBalance,
  onGetPresenceReceipt: onGetPresenceReceipt,
  onCallTx: onCallTx,
  onVerifyPresence: onVerifyPresence,
  onSendTx: onSendTx,
  onGetClientTxStatus: onGetClientTxStatus,
  onGetTxStatus: onGetTxStatus,
  onVerifyPresenceAndSendTx: onVerifyPresenceAndSendTx,
  onGetContractAddress: onGetContractAddress,
  onGetContract: onGetContract,
  onGetContractIndicate: onGetContractIndicate,
  generatePublicationHandler: generatePublicationHandler
}
