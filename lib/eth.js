'use strict'

// -------------------------------------- Imports --------------------------------------------------
// Ethereum
const Web3 = require('web3')
const util = require('ethereumjs-util')

// NPM
const Pouchdb = require('pouchdb')

// Animist
const config = require('../lib/config')

// ------------------------------------ Locals/Setup -----------------------------------------------
const codes = config.codes

let contracts = (!process.env.TRAVIS)
          ? new Pouchdb('http://localhost:5984/animistEvents')
          : new Pouchdb('animistEvents')

exports.db = () => contracts

// -------------------------------- Web3 Testing (test-rpc) ----------------------------------------
const network = 'http://localhost:8545'
const testRpc = new Web3.providers.HttpProvider(network)
const web3 = new Web3(testRpc)
const nodeAccount = web3.eth.accounts[0]

// -------------------------------------  Utilities ------------------------------------------------

/**
 Recovers address used to sign a message, which may be encoded rpc or non-rpc formats
 (Will generate non-existent address if data signed and 'rawMsg' are not identical.)
 @method recover
 @param {String} rawMsg: the endpoints currently broadcast pin
 @param {(Object|String)} signed: a value signed by the callers account
 @returns {String} account: hex prefixed public address of msg signer.
 @returns undefined if ethereumjs-util throws an error during recovery.
*/
const recover = exports.recover = function (rawMsg, signed) {
  if (rawMsg === null) {
    return null
  }

  try {
    // Check if this is a web3 signature & covert to obj.
    (!signed.hasOwnProperty('v'))
      ? signed = util.fromRpcSig(signed)
      : null

    const msgHash = util.sha3(rawMsg)
    const pub = util.ecrecover(msgHash, signed.v, signed.r, signed.s)
    const addr = util.pubToAddress(pub)
    return util.addHexPrefix(addr.toString('hex'))
  } catch (e) {
    return null
  }
}

// ---------------------------------------  Core  --------------------------------------------------

/**
 Wraps web3.eth.blockNumber.
 @method getBlockNumber
 @returns {Number}
*/
exports.getBlockNumber = function () {
  return web3.eth.blockNumber
}

/**
 Wraps web3.eth.getBalance
 @method getAccountBalance
 @returns {String} representing amount of wei
 */
exports.getAccountBalance = function (address) {
  return web3.eth.getBalance(address).toString()
}

/**
 * Responds with data that can be used to authenticate clients presence near
 * endpoint. (See onGetPresenceReceipt in lib/handlers.js)
 * @method  getPresenceReceipt
 * @param { String } pin: current pin value
 * @param { String } signedPin: current pin signed by caller's account
 * @returns { Object } {time: '1453...9', signedTime: '0xaf..9e', signedAddress: '0x32...ae'}
 * @returns { Object }  Null on error.
 */
exports.getPresenceReceipt = function (pin, signedPin) {
  const client = recover(pin, signedPin)
  const time = Date.now().toString()
  const timeHash = web3.sha3(time)
  const addressHash = web3.sha3(client, {encoding: 'hex'})
  const signedTime = web3.eth.sign(config.animistAccount, timeHash)
  const signedAddress = web3.eth.sign(config.animistAccount, addressHash)

  return {
    time: time,
    signedTime: signedTime,
    signedAddress: signedAddress
  }
}
/**
 * Wraps web3.eth.call. Method should require no gas and no "from" parameter. See onCallTx
 * @method  callTx
 * @param { String } method: a call to constant public function
 * @returns { String } hex encoded value per web3 OR error string.
 */
exports.callTx = function (method) {
  try {
    return web3.eth.call(method)
  } catch (err) {
    return err.toString().split('\n')[0];
  }
}

/**
  Queries blockchain for transaction receipt.
  @method getTx
  @returns {Promise} Resolves `{ blockNumber: <int> OR <null>, nonce: <int>, gas: <int> }`
  @returns {Promise} Rejects w/ hex code: NO_TX_DB_ERR
*/
exports.getTx = function (txHash) {
  return new Promise((resolve, reject) => {
    web3.eth.getTransaction(txHash, (err, tx) => {
      (err || !tx)
        ? reject(codes.NO_TX_DB_ERR)
        : resolve({
          blockNumber: tx.blockNumber,
          nonce: tx.nonce,
          gas: tx.gas
        })
    })
  })
}

/**
 Extracts client address from signed pin and looks for record from eventsDB with that id. Returns
 object that contains contract address and contract's code.
 @method getContract
 @returns {Promise} Resolves contract data: `{contractAddress: '0x821a..05', code: '0x453ce...03'}`
 @returns {Promise} Rejects with hex code: NO_TX_DB_ERR or NO_TX_ADDR_ERR
*/
exports.getContract = function (pin, signed) {
  const res = {}
  const address = recover(pin, signed)

  if (address) {
    return contracts.get(address)
      .then(doc => {
        res.code = web3.eth.getCode(doc.contractAddress)
        res.contractAddress = doc.contractAddress
        return res
      })
      .catch(e => Promise.reject(codes.NO_TX_DB_ERR))
  } else return Promise.reject(codes.NO_TX_ADDR_ERR)
}

/**
 Extracts client address from signed pin and looks for record from eventsDB with that id. Returns
 contract address.
 @method getContract
 @returns {Promise} Resolves string contract address: `0x821af...05`
 @returns {Promise} Rejects with hex code: NO_TX_DB_ERR or NO_TX_ADDR_ERR
*/
exports.getContractAddress = function (pin, signed) {
  const address = recover(pin, signed)

  if (address) {
    return contracts.get(address)
      .then(doc => doc.contractAddress)
      .catch(e => Promise.reject(codes.NO_TX_DB_ERR))
  } else {
    return Promise.reject(codes.NO_TX_ADDR_ERR)
  }
}

/**
 Invokes verifyPresence on the contract discovered in the contractsDB.
 verifyPresence prints caller was here, 'timestamped' now, to chain.
 @method verifyPresence
 @returns {Promise} Resolves hash string of pending presence verification tx.
 @returns {Promise} Rejects w/ hex code: NO_TX_FOUND
*/
exports.verifyPresence = function (pin, signed) {
  const clientContract = web3.eth.contract(config.methodsABI)
  const client = recover(pin, signed)

  if (client) {
    // Get contract address, compose instance & invoke verifyPresence
    return contracts.get(client)
      .then(doc => {
        const instance = clientContract.at(doc.contractAddress)
        return instance.verifyPresence(client, Date.now(), {from: nodeAccount})
      })
      .catch(e => Promise.reject(codes.NO_TX_DB_ERR))
  } else {
    return Promise.reject(codes.NO_TX_ADDR_ERR)
  }
}

/**
 * Prints client-signed tx to blockchain. A wrapper for web3 sendRawTransaction.
 * @method sendTx
 * @param {String} tx: a signed transaction
 * @returns {String} txHash of sendRawTransaction
 */
exports.sendTx = function (tx) {
  return web3.eth.sendRawTransaction(tx)
}

/**
 Waits for verifyPresence tx to be mined then sends tx. Updates client's contract record with
 verifyPresenceTx's status when pending, successful, failed and saves signed client Tx transaction
 hash to record on success.
 @method sendTxWhenPresenceVerified
 @param {String} verifyPresenceTxHash: hash of pending presence ver. tx sent by animist device
 @param {String} signedTx: signed tx submittable w/ eth.sendRawTransaction
 @param {String} address: the client account address
 @param {Function} cb: optional callback for unit testing.
*/
exports.sendTxWhenPresenceVerified = function (
    verifyPresenceTxHash,
    signedTx,
    address,
    cb) {

  // Stub callback
  if (cb === undefined) cb = () => {}

  // Fetch contract record.
  contracts.get(address).then(doc => {
    // Mark contract's status as 'pending' in contractsDB
    contracts.put({
      _id: address,
      _rev: doc._rev,
      verifyPresenceStatus: 'pending',
      verifyPresenceTxHash: verifyPresenceTxHash,
      clientTxHash: null
    })
    // Query blockchain about verifyPresence tx every ~20 sec
    .then(res => {
      let waitCycles = 0
      const gasLimit = web3.eth.getTransaction(verifyPresenceTxHash).gas
      const loop = setInterval(() => {
        // Cap number of times to loop.
        if (waitCycles >= config.MAX_CONFIRMATION_CYCLES) {
          clearInterval(loop)
          cb(waitCycles)
        
        // Check if verifyPresence transaction was mined (i.e. blocknumber not null)
        } else if (web3.eth.getTransaction(verifyPresenceTxHash).blockNumber) {
          let mined = web3.eth.getTransactionReceipt(verifyPresenceTxHash)

          // Mark verifyPresence as failed on error, cancel loop.
          if (mined.gasUsed === gasLimit) {
            contracts.put({
              _id: address,
              _rev: res.rev,
              verifyPresenceStatus: 'failed',
              verifyPresenceTxHash: verifyPresenceTxHash,
              clientTxHash: null
            })
            .then(res => { clearInterval(loop); cb(res) })
            .catch(e => clearInterval(loop))

          // Or send raw transaction, update db, cancel loop.
          } else {
            const sendRawTxHash = web3.eth.sendRawTransaction(signedTx)
            contracts.put({
              _id: address,
              _rev: res.rev,
              verifyPresenceStatus: 'success',
              verifyPresenceTxHash: verifyPresenceTxHash,
              clientTxHash: sendRawTxHash
            })
            .then(res => { clearInterval(loop); cb(res) })
            .catch(e => clearInterval(loop))
          }
        // Increment loop counter
        } else {
          waitCycles++
        }
      }, config.MINING_CHECK_INTERVAL)
    })
    // Catch here but it should be impossible to reach this point
    // in the code without having a record in the db.
    }).catch(e => console.log('DB failure getting contract record @ sendTxWhenPresenceVerified'))
}

/**
 * Invokes client contract method: `isAuthorizedToReadMessage` and returns boolean result.
 * @param  {Object}  args   Event args from a requestMessagePublication event
 * @param  {String}  client Account address of connected client requesting message.
 * @return {Boolean}        True if client can receive msg, false otherwise.
 */
exports.isAuthorizedToReadMessage = function (args, client) {
  try {
    const clientContract = web3.eth.contract(config.methodsABI)
    const instance = clientContract.at(args.contractAddress)
    return instance.isAuthorizedToReadMessage(client, args.uuid)
  } catch (e) {
    return false
  }
}

/**
 * Invokes client contract method `confirmMessageDelivery` and returns boolean.
 * @param  {Object} args   Event args from a requestMessagePublication event
 * @param  {String} client Account address of connected client requesting message.
 * @return {Boolean}       True if it was possible to invoke method, false otherwise.
 */
exports.confirmMessageDelivery = function (args, client) {
  try {
    const gas = 3141592 // Development: pending fixes to testrpc gas estimation.
    const clientContract = web3.eth.contract(config.methodsABI)
    const instance = clientContract.at(args.contractAddress)
    instance.confirmMessageDelivery(client, args.uuid, Date.now(), {from: nodeAccount, gas: gas})
    return true
  } catch (e) {
    return false
  }
}

// Covenience methods for unit tests
exports.units = {
  setDB: db => { contracts = db }, // Set local db to testing env db
  getWeb3: () => web3,             // Make this instance of web3 avail to mock it.
  setMiningCheckInterval: val => { config.MINING_CHECK_INTERVAL = val }, // Mock mining check.
  setConfCycles: val => { config.MAX_CONFIRMATION_CYCLES = val }         // Mock conf cycles.
}
