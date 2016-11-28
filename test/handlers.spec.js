'use strict'
// -------------------------------------- Imports --------------------------------------------------
// Local
let config = require('../lib/config')
let ble = require('../lib/handlers')
let util = require('../lib/util')
let eth = require('../lib/eth')
let defs = ble.defs

// Mocks
const account = require('../test/mocks/wallet')
const transactions = require('../test/mocks/transaction')
const bleno = require('../test/mocks/bleno.js')

// Ethereum
const Web3 = require('web3')
const ethJsUtil = require('ethereumjs-util')
const wallet = require('eth-lightwallet')

// Misc NPM
const Pouchdb = require('pouchdb')
const bufferEqual = require('buffer-equal')

// Testing
const chai = require('chai')
const spies = require('chai-spies')
const chaiAsPromised = require('chai-as-promised')

// --------------------------------------- Setup ---------------------------------------------------
const expect = chai.expect
chai.use(spies)
chai.use(chaiAsPromised)

const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider)

// --------------------------------------- Tests ---------------------------------------------------

describe('BLE Request Handlers', () => {
  let keystore
  let address
  let hexAddress
  let deployed
  let goodTx
  let badTx
  let callGetVerified
  let client = web3.eth.accounts[0]
  let nullFn = (val) => {}

  before(() => {
    // Don't clear the pin
    util._units.setPinResetInterval(500000)

    // Prep an eth-lightwallet keystore/account for pin signing tests
    let json = JSON.stringify(account.keystore)
    keystore = wallet.keystore.deserialize(json)
    keystore.generateNewAddress(account.key, 1)
    address = keystore.getAddresses()[0]    // Lightwallet's addresses are not prefixed.
    hexAddress = '0x' + address             // Eth's are prefixed - we recover them as this.

    // Occasionally we need to generate the ABI for the config.
    // transactions.methodsABI();
    // transactions.eventsABI();

    // Deploy TestContract, compose some signed transactions for rawTx submission.
    return transactions.generate().then(mock => {
      deployed = mock.deployed                // TestContract.sol deployed to test-rpc
      goodTx = mock.goodTx                    // raw: TestContract.set(2, {from: client})
      badTx = mock.badTx                      // raw: goodTx but sent with 0 gas.
      callGetVerified = mock.callGetVerified  // array vals: call getVerified
    })
  })

  // --------------------------------- onGetPin ----------------------------------------------------
  describe('onGetPin', () => {
    it('should respond w/ a newly generated pin', (done) => {
      let oldPin = new Buffer(util.getPinSafe(true))
      let cb = (code, pin) => {
        let newPin = new Buffer(util.getPin())
        expect(code).to.equal(config.codes.RESULT_SUCCESS)
        expect(bufferEqual(pin, newPin)).to.be.true
        expect(bufferEqual(pin, oldPin)).to.be.false
        done()
      }
      ble.onGetPin(null, cb)
    })
  })

  // ------------------------------ onGetDeviceAccount ---------------------------------------------
  describe('onGetDeviceAccount', () => {
    it('should respond w/ the devices public account address and disconnect', (done) => {
      let expected = new Buffer(JSON.stringify(config.animistAccount))
      // Test
      let cb = (code, account) => {
        expect(bufferEqual(account, expected)).to.be.true
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      ble.onGetDeviceAccount(null, cb)
    })
  })

  // -------------------------------- onGetPgpKeyId ------------------------------------------------
  describe('onGetPgpKeyId', () => {
    it('should respond w/ the devices public pgp keyID and disconnect', (done) => {
      let expected = new Buffer(JSON.stringify(config.pgpKeyId))
      // Test
      let callback = (code, key) => {
        expect(bufferEqual(key, expected)).to.be.true
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      ble.onGetPgpKeyId(null, callback)
    })
  })

  // ------------------------------ onGetAccountBalance --------------------------------------------
  describe('onGetAccountBalance', () => {
    let accounts = web3.eth.accounts

    it('should respond w/ RESULT_SUCCESS', (done) => {
      let input = JSON.stringify(accounts[3])
      let updateValueCallback = val => done()
      let cb = (code) => expect(code).to.equal(config.codes.RESULT_SUCCESS)

      defs.getAccountBalanceCharacteristic.updateValueCallback = updateValueCallback
      ble.onGetAccountBalance(input, null, null, cb)
    })

    it('should send data about the queried tx and disconnect', (done) => {
      let account = accounts[3]
      let input = JSON.stringify(account)
      let balance = web3.eth.getBalance(account).toString()
      let expected = new Buffer(JSON.stringify(balance))

      // Test
      let updateValueCallback = (val) => {
        expect(bufferEqual(val, expected)).to.be.true
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      defs.getAccountBalanceCharacteristic.updateValueCallback = updateValueCallback
      ble.onGetAccountBalance(input, null, null, nullFn)
    })

    it('should respond with NO_TX_DB_ERR if input is malformed and disconnect', (done) => {
      let malformed = JSON.stringify('0x000000000000000012345')

      // Test
      let cb = (code) => {
        expect(code).to.equal(config.codes.NO_TX_ADDR_ERR)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      ble.onGetAccountBalance(malformed, null, null, cb)
    })

    it('should send "0" if account non-existent and disconnect', (done) => {
      let missing = JSON.stringify('0x4dea71bde50f23d347d6b21e18c50f02221c50ae')
      let expected = new Buffer(JSON.stringify('0'))

      // Test
      let updateValueCallback = (val) => {
        expect(bufferEqual(val, expected)).to.be.true
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      defs.getAccountBalanceCharacteristic.updateValueCallback = updateValueCallback
      ble.onGetAccountBalance(missing, null, null, nullFn)
    })
  })

  // --------------------------------- onGetTxStatus -----------------------------------------------
  describe('onGetTxStatus', () => {
    let hash
    let input
    let accounts = web3.eth.accounts

    beforeEach(() => {
      hash = web3.eth.sendTransaction({ from: accounts[0], to: accounts[1], value: 100 })
      input = JSON.stringify(hash)
    })

    it('should respond w/ RESULT_SUCCESS', (done) => {
      let cb = (code) => expect(code).to.equal(config.codes.RESULT_SUCCESS)
      let updateValueCallback = val => done()

      defs.getTxStatusCharacteristic.updateValueCallback = updateValueCallback
      ble.onGetTxStatus(input, null, null, cb)
    })

    it('should send data about the queried tx and disconnect', (done) => {
      let tx = web3.eth.getTransaction(hash)
      let res = {blockNumber: tx.blockNumber, nonce: tx.nonce, gas: tx.gas}
      let expected = new Buffer(JSON.stringify(res))

      // Test
      let updateValueCallback = (val) => {
        expect(bufferEqual(val, expected)).to.be.true
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      defs.getTxStatusCharacteristic.updateValueCallback = updateValueCallback
      ble.onGetTxStatus(input, null, null, nullFn)
    })

    it('should respond with INVALID_TX_HASH if input is malformed and disconnect', (done) => {
      let malformed = JSON.stringify('0x000000000000000012345')
      // Test
      let cb = (code) => {
        expect(code).to.equal(config.codes.INVALID_TX_HASH)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      ble.onGetTxStatus(malformed, null, null, cb)
    })

    it('should send "null" if unable to find tx and disconnect', (done) => {
      let missing = JSON.stringify('0xf087407379e66de3d69da365826272f7750e6c978f5c2d034296de168f500000')
      let expected = new Buffer(JSON.stringify(null))

      // Test
      let updateValueCallback = (val) => {
        expect(JSON.parse(val)).to.be.a('null')
        expect(bufferEqual(val, expected)).to.be.true
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      defs.getTxStatusCharacteristic.updateValueCallback = updateValueCallback
      ble.onGetTxStatus(missing, null, null, nullFn)
    })
  })

  // ------------------------------ onGetPresenceReceipt -------------------------------------------
  describe('onGetPresenceReceipt', () => {
    let signedPin

    beforeEach(() => {
      // Mock client signed pin (web3 style),
      let pin = util.getPinSafe(true)
      let msgHash = web3.sha3(pin)
      signedPin = web3.eth.sign(client, msgHash)
    })

    it('should respond w/ RESULT_SUCCESS', (done) => {
      let data = JSON.stringify(signedPin)
      let cb = (code) => expect(code).to.equal(config.codes.RESULT_SUCCESS)
      let updateValueCallback = val => done()
      defs.getPresenceReceiptCharacteristic.updateValueCallback = updateValueCallback
      ble.onGetPresenceReceipt(data, null, null, cb)
    })

    it('should send signed timestamp and signed caller data and disconnect', (done) => {
      let data = JSON.stringify(signedPin)

      // Test
      let updateValueCallback = (_val) => {
        let val = JSON.parse(_val)
        let recoveredFromTime = eth.recover(val.time, val.signedTime)
        let recoveredFromAddress = eth.recover(client, val.signedAddress)
        expect(Buffer.isBuffer(_val)).to.be.true
        expect(recoveredFromTime).to.equal(config.animistAccount)
        expect(recoveredFromAddress).to.equal(config.animistAccount)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      defs.getPresenceReceiptCharacteristic.updateValueCallback = updateValueCallback
      ble.onGetPresenceReceipt(data, null, null, nullFn)
    })

    it('should respond with NO_TX_DB_ERR if input is malformed and disconnect', (done) => {
      let malformed = JSON.stringify('dd5[w,r,0,,n,g')
      // Test
      let cb = (code) => {
        expect(code).to.equal(config.codes.NO_SIGNED_MSG_IN_REQUEST)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      ble.onGetPresenceReceipt(malformed, null, null, cb)
    })
  })

  // ------------------------------------ onCallTx -------------------------------------------------
  describe('onCallTx', function () {
    it('should respond with RESULT_SUCCESS', (done) => {
      let data = JSON.stringify(callGetVerified)
      let cb = (code) => expect(code).to.equal(config.codes.RESULT_SUCCESS)
      let updateValueCallback = val => done()
      defs.callTxCharacteristic.updateValueCallback = updateValueCallback
      ble.onCallTx(data, null, null, cb)
    })

    it('should send a hex string result and disconnect', (done) => {
      let data = JSON.stringify(callGetVerified)
      let out = '0x0000000000000000000000000000000000000000000000000000000000000001'

      // Test
      let updateValueCallback = val => {
        expect(bufferEqual(val, out)).to.be.true
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      out = new Buffer(JSON.stringify(out))
      defs.callTxCharacteristic.updateValueCallback = updateValueCallback
      ble.onCallTx(data, null, null, nullFn)
    })

    it('should respond w/ error code if data does not parse correctly and disconnect', (done) => {
      let data = JSON.stringify(['3948394893', 890823493])
      // Test
      let cb = (code) => {
        expect(code).to.equal(config.codes.INVALID_CALL_DATA)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      ble.onCallTx(data, null, null, cb)
    })
  })

  // ---------------------------------- onVerifyPresence -------------------------------------------
  describe('onVerifyPresence', function () {
    let input
    let ethDb

    // Hack: duplicate recs getting stuck in db but don't know how. This clears them.
    before(() => {
      ethDb = new Pouchdb('animistEvents')
      return ethDb.destroy()
    })

    // Mock client signed pin (web3 style) & load contract record into contractsDB.
    beforeEach((done) => {
      let pin = util.getPinSafe(true)
      let msgHash = web3.sha3(pin)
      let signed = web3.eth.sign(client, msgHash)
      let record = { _id: client, authority: client, contractAddress: deployed.address }

      input = JSON.stringify(signed)
      ethDb = new Pouchdb('animistEvents')
      eth.units.setDB(ethDb)
      ethDb.put(record).then(() => done())
    })

    // Cleanup
    afterEach(() => ethDb.destroy())

    it('should respond w/ RESULT_SUCCESS', (done) => {
      let cb = (code) => expect(code).to.equal(config.codes.RESULT_SUCCESS)
      let updateValueCallback = val => { done() }

      defs.verifyPresenceCharacteristic.updateValueCallback = updateValueCallback
      util.encrypt(input).then(encrypted => {
        ble.onVerifyPresence(encrypted, null, null, cb)
      })
    })

    it('should send the tx hash of the verifyPresence call and disconnect', (done) => {
      // Test
      let updateValueCallback = (val) => {
        // Check txHash form: Is buffer, right length, hex prefixed
        expect(Buffer.isBuffer(val)).to.be.true
        expect(val.length).to.equal(68)
        expect(ethJsUtil.isHexPrefixed(JSON.parse(val))).to.be.true
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      defs.verifyPresenceCharacteristic.updateValueCallback = updateValueCallback
      util.encrypt(input).then(encrypted => {
        ble.onVerifyPresence(encrypted, null, null, nullFn)
      })
    })

    it('should respond with DECRYPTION_FAILED if input is unencrypted', (done) => {
      // Test
      let cb = (code) => {
        expect(code).to.equal(config.codes.DECRYPTION_FAILED)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      ble.onVerifyPresence(input, null, null, cb)
    })

    it('should respond with NO_SIGNED_MSG_IN_REQUEST if input is malformed and disconnect', (done) => {
      let malformed = JSON.stringify('dd5[w,r,0,,n,g')
      // Test
      let cb = (code) => {
        expect(code).to.equal(config.codes.NO_SIGNED_MSG_IN_REQUEST)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      util.encrypt(malformed).then((encrypted) => {
        ble.onVerifyPresence(encrypted, null, null, cb)
      })
    })

    it('should send "null" if unable to find tx', (done) => {
      let expected = new Buffer(JSON.stringify(null)) // Expecting 'null'
      let nonClient = web3.eth.accounts[3]            // Mock good pin sign, non-existent client.
      let pin = util.getPinSafe(true)
      let msgHash = web3.sha3(pin)
      let signed = web3.eth.sign(nonClient, msgHash)

      // Test
      let updateValueCallback = (val) => {
        expect(JSON.parse(val)).to.be.a('null')
        expect(bufferEqual(val, expected)).to.be.true
        done()
      }
      // Call
      input = JSON.stringify(signed)
      defs.verifyPresenceCharacteristic.updateValueCallback = updateValueCallback
      util.encrypt(input).then(encrypted => {
        ble.onVerifyPresence(encrypted, null, null, nullFn)
      })
    })
  })

  // ---------------------------- onVerifyPresenceAndSendTx ----------------------------------------
  describe('onVerifyPresenceAndSendTx', () => {
    let signed
    let ethDb

    beforeEach(() => {
      // Mock client signed pin (web3 style),
      let pin = util.getPinSafe(true)
      let msgHash = web3.sha3(pin)
      let record = { _id: client, authority: client, contractAddress: deployed.address }

      signed = web3.eth.sign(client, msgHash)
      ethDb = new Pouchdb('animistEvents')
      eth.units.setDB(ethDb)
      return ethDb.put(record)
    })

    // Cleanup
    afterEach(() => ethDb.destroy())

    it('should respond w/ RESULT_SUCCESS if pin and tx parse ok', (done) => {
      let data = JSON.stringify({pin: signed, tx: goodTx})
      let cb = (val) => expect(val).to.equal(config.codes.RESULT_SUCCESS)
      let updateValueCallback = (sent) => setTimeout(() => done(), 55)

      defs.verifyPresenceAndSendTxCharacteristic.updateValueCallback = updateValueCallback
      util.encrypt(data).then(encrypted => {
        ble.onVerifyPresenceAndSendTx(encrypted, null, null, cb)
      })
    })

    it('should send the tx hash of the verifyPresence method call and disconnect', (done) => {
      let data = JSON.stringify({pin: signed, tx: goodTx})

      // Test: check txHash form: Is buffer, right length, hex prefixed
      let updateValueCallback = (val) => {
        expect(Buffer.isBuffer(val)).to.be.true
        expect(val.length).to.equal(68)
        expect(ethJsUtil.isHexPrefixed(JSON.parse(val))).to.be.true
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      defs.verifyPresenceAndSendTxCharacteristic.updateValueCallback = updateValueCallback
      util.encrypt(data).then(encrypted => {
        ble.onVerifyPresenceAndSendTx(encrypted, null, null, nullFn)
      })
    })

    it('should call sendTxWhenPresenceVerified', (done) => {
      let data = JSON.stringify({pin: signed, tx: goodTx})

      // Test
      let updateValueCallback = (sent) => {
        expect(eth.sendTxWhenPresenceVerified).to.have.been.called()
        done()
      }
      // Call
      chai.spy.on(eth, 'sendTxWhenPresenceVerified')
      defs.verifyPresenceAndSendTxCharacteristic.updateValueCallback = updateValueCallback
      util.encrypt(data).then(encrypted => {
        ble.onVerifyPresenceAndSendTx(encrypted, null, null, nullFn)
      })
    })

    it('should respond with DECRYPTION_FAILED if input is unencrypted', (done) => {
      let data = JSON.stringify({pin: signed, tx: goodTx})
      // Test
      let cb = (code) => {
        expect(code).to.equal(config.codes.DECRYPTION_FAILED)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      ble.onVerifyPresenceAndSendTx(data, null, null, cb)
    })

    it('should respond w/error if sent pin is bad and disconnect', (done) => {
      let data = JSON.stringify({pin: 'dd5[w,r,0,,n,g', tx: badTx})
      // Test
      let cb = (val) => {
        expect(val).to.equal(config.codes.NO_SIGNED_MSG_IN_REQUEST)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      util.encrypt(data).then(encrypted => {
        ble.onVerifyPresenceAndSendTx(encrypted, null, null, cb)
      })
    })

    it('should respond w/error if sent tx is bad and disconnect', (done) => {
      let data = JSON.stringify({pin: signed, tx: badTx})
      // Test
      let cb = (val) => {
        expect(val).to.equal(config.codes.INSUFFICIENT_GAS)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      util.encrypt(data).then(encrypted => {
        ble.onVerifyPresenceAndSendTx(encrypted, null, null, cb)
      })
    })
  })

  // ----------------------------------- onSendTx --------------------------------------------------
  describe('onSendTx', () => {
    let signed
    let ethDb

    beforeEach(() => {
      // Mock client signed pin (web3 style) / Prime db w/ mock record
      let pin = util.getPinSafe(true)
      let msgHash = web3.sha3(pin)
      let record = { _id: client, authority: client, contractAddress: deployed.address }
      signed = web3.eth.sign(client, msgHash)
      ethDb = new Pouchdb('animistEvents')
      eth.units.setDB(ethDb)
      return ethDb.put(record)
    })

    // Cleanup
    afterEach(() => ethDb.destroy())

    it('should respond w/ RESULT_SUCCESS if sent data ok', (done) => {
      let data = JSON.stringify({pin: signed, tx: goodTx})
      let updateValueCallback = (sent) => done()

      // Test
      let cb = (val) => expect(val).to.equal(config.codes.RESULT_SUCCESS)
      // Call
      defs.sendTxCharacteristic.updateValueCallback = updateValueCallback
      util.encrypt(data).then(encrypted => {
        ble.onSendTx(encrypted, null, null, cb)
      })
    })

    it('should send txHash of the sent transaction and disconnect', (done) => {
      let data = JSON.stringify({ pin: signed, tx: goodTx })

      // Test
      let updateValueCallback = (val) => {
        expect(Buffer.isBuffer(val)).to.be.true
        expect(val.length).to.equal(68)
        expect(ethJsUtil.isHexPrefixed(JSON.parse(val))).to.be.true
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Setup & Call
      chai.spy.on(bleno, 'disconnect')
      defs.sendTxCharacteristic.updateValueCallback = updateValueCallback
      util.encrypt(data).then(encrypted => {
        ble.onSendTx(encrypted, null, null, nullFn)
      })
    })

    it('should response with DECRYPTION_FAILED if input is unencrypted', (done) => {
      let data = JSON.stringify({pin: signed, tx: goodTx})

      // Test
      let cb = (code) => {
        expect(code).to.equal(config.codes.DECRYPTION_FAILED)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Call
      chai.spy.on(bleno, 'disconnect')
      ble.onSendTx(data, null, null, cb)
    })

    it('should respond with TX_PENDING if caller cant send a tx and disconnect', (done) => {
      let data = JSON.stringify({pin: signed, tx: goodTx})
      let updateValueCallback = (sent) => {}
      // Test
      let cb = (val) => {
        expect(val).to.equal(config.codes.TX_PENDING)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Set client's contract status to 'pending' and attempt send
      chai.spy.on(bleno, 'disconnect')
      defs.sendTxCharacteristic.updateValueCallback = updateValueCallback
      ethDb.get(client).then(doc => {
        doc.verifyPresenceStatus = 'pending'
        ethDb.put(doc).then(doc => {
          util.encrypt(data).then(encrypted => {
            ble.onSendTx(encrypted, null, null, cb)
          })
        })
      })
    })
  })

  // ------------------------------ onGetClientTxStatus --------------------------------------------
  describe('onGetClientTxStatus', () => {
    let signed
    let input
    let ethDb

    // Hack: duplicate recs getting stuck in db but don't know how. This clears them.
    before(() => {
      ethDb = new Pouchdb('animistEvents')
      return ethDb.destroy()
    })
    // Mock client signed pin (web3 style) & initialize db.
    beforeEach(() => {
      let pin = util.getPinSafe(true)
      let msgHash = web3.sha3(pin)
      signed = web3.eth.sign(client, msgHash)
      input = JSON.stringify(signed)
      ethDb = new Pouchdb('animistEvents')
      eth.units.setDB(ethDb)
    })

    // Cleanup
    afterEach(() => ethDb.destroy())

    it('should respond w/ RESULT_SUCCESS', (done) => {
      let cb = (code) => expect(code).to.equal(config.codes.RESULT_SUCCESS)
      let updateValueCallback = val => done()
      defs.getClientTxStatusCharacteristic.updateValueCallback = updateValueCallback
      ble.onGetClientTxStatus(input, null, null, cb)
    })

    it('should send presenceStatus, presenceTxHash & clientTxStatus data and disconnect', (done) => {
      let mockRecord = {
        _id: client,
        contractAddress: deployed.address,
        verifyPresenceStatus: 'pending',
        verifyPresenceTxHash: '0x00001',
        clientTxHash: null
      }

      // Test
      let updateValueCallback = val => {
        expect(Buffer.isBuffer(val)).to.be.true
        val = JSON.parse(val)
        expect(val.verifyPresenceStatus).to.equal('pending')
        expect(val.verifyPresenceTxHash).to.equal('0x00001')
        expect(val.clientTxHash).to.equal(null)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }

      chai.spy.on(bleno, 'disconnect')
      defs.getClientTxStatusCharacteristic.updateValueCallback = updateValueCallback
      ethDb.put(mockRecord)
        .then(res => ble.onGetClientTxStatus(input, null, null, nullFn))
    })

    it('should behave as expected: e2e', (done) => {
      let mockRecord = { _id: client, authority: client, contractAddress: deployed.address }
      let data = JSON.stringify({pin: signed, tx: goodTx})

      // Test
      let updateValueCallback = (val) => {
        expect(Buffer.isBuffer(val)).to.be.true
        val = JSON.parse(val)
        expect(val.verifyPresenceStatus).to.equal('success')
        expect(val.verifyPresenceTxHash.length).to.equal(66)
        expect(val.clientTxHash.length).to.equal(66)
        eth.units.setMiningCheckInterval(originalMining)
        done()
      }

      // Setup: Fast mine verifyPresenceAndSendTx
      let originalMining = config.MINING_CHECK_INTERVAL
      eth.units.setMiningCheckInterval(10)
      // Setup: Check getClientTxStatus val after +1 sec.
      setTimeout(() => ble.onGetClientTxStatus(input, null, null, nullFn), 2000)
      // Setup & simulate an verifyPresenceAndSendTx call.
      defs.getClientTxStatusCharacteristic.updateValueCallback = updateValueCallback
      defs.verifyPresenceAndSendTxCharacteristic.updateValueCallback = () => {}
      ethDb.put(mockRecord)
        .then(res => util.encrypt(data)
        .then(encrypted => ble.onVerifyPresenceAndSendTx(encrypted, null, null, nullFn)))
    })

    it('should send "null" if it cant find the contract record and disconnect', (done) => {
      let expected = new Buffer(JSON.stringify(null))
      let mockRecord = {
        _id: 'not_the_id_you_need',
        contractAddress: deployed.address,
        verifyPresenceStatus: 'pending',
        verifyPresenceTxHash: '0x00001',
        clientTxHash: null
      }

      // Test
      let updateValueCallback = (val) => {
        expect(bufferEqual(val, expected)).to.be.true
        expect(JSON.parse(val)).to.be.a('null')
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Setup & Call
      chai.spy.on(bleno, 'disconnect')
      defs.getClientTxStatusCharacteristic.updateValueCallback = updateValueCallback
      ethDb.put(mockRecord).then(res => ble.onGetClientTxStatus(input, null, null, nullFn))
    })

    it('should respond w/ error code if pin signature doesnt parse and disconnect', (done) => {
      let data = JSON.stringify('dd5[w,r,0,,n,g')
      // Test
      let cb = (val) => {
        expect(val).to.equal(config.codes.NO_SIGNED_MSG_IN_REQUEST)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Setup & Call
      chai.spy.on(bleno, 'disconnect')
      ble.onGetClientTxStatus(data, null, null, cb)
    })
  })

  // --------------------------------- onGetBlockNumber --------------------------------------------
  describe('onGetBlockNumber', () => {
    it('should respond w/RESULT_SUCCESS & the current blockNumber and disconnect', (done) => {
      // Test
      let cb = (code, val) => {
        // Translate bufferized-stringified-int to int
        let valString = JSON.parse(val)
        let valInt = parseInt(valString)
        expect(code).to.equal(config.codes.RESULT_SUCCESS)
        expect(valInt).to.equal(web3.eth.blockNumber)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }
      // Setup & call
      chai.spy.on(bleno, 'disconnect')
      ble.onGetBlockNumber(null, cb)
    })
  })

  // ------------------------------ onGetContractAddress -------------------------------------------
  describe('onGetContractAddress', () => {
    let req
    let ethDb
    let mockContract

    // Mocks
    before(() => {
      req = wallet.signing.signMsg(keystore, account.key, util.getPinSafe(true), address)
      req = JSON.stringify(req)
      mockContract = { _id: hexAddress, contractAddress: deployed.address }
    })
    // Clear state, set a contract to find,  & mock updateValueCallback
    beforeEach(() => {
      ethDb = new Pouchdb('animistEvents')
      eth.units.setDB(ethDb)
      defs.getContractAddressCharacteristic.updateValueCallback = (val) => {}
      return ethDb.put(mockContract)
    })
    // Clean up
    afterEach(() => ethDb.destroy())

    it('should respond w/ RESULT_SUCCESS if a tx matching the address is found', (done) => {
      // Test
      // Run the timeout too or it will f the subsequent tests
      let cb = (code) => {
        expect(code).to.equal(config.codes.RESULT_SUCCESS)
        setTimeout(done, 55)
      }
      ble.onGetContractAddress(req, null, null, cb)
    })

    it('should respond with the contract address', (done) => {
      // Test
      let updateValueCallback = val => {
        expect(Buffer.isBuffer(val)).to.be.true
        val = JSON.parse(val)
        expect(val).to.equal(deployed.address)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }

      chai.spy.on(bleno, 'disconnect')
      defs.getContractAddressCharacteristic.updateValueCallback = updateValueCallback
      ble.onGetContractAddress(req, null, null, nullFn)
    })

    it('should respond w/ NO_TX_DB_ERR if no tx matches the address and disconnect', (done) => {
      let fn = { cb: nullFn }
      chai.spy.on(fn, 'cb')
      chai.spy.on(bleno, 'disconnect')
      // Setup: delete mock from contracts DB
      ethDb.get(hexAddress)
        .then(doc => { return ethDb.remove(doc) })
        .then(() => {
          setTimeout(() => {
            expect(fn.cb).to.have.been.called.with(config.codes.NO_TX_DB_ERR)
            expect(bleno.disconnect).to.have.been.called()
            done()
          }, 55)
          ble.onGetContractAddress(req, null, null, fn.cb)
        })
    })

    it('should respond w/ error code if req is un-parseable and disconnect', (done) => {
      let req = 'dd5[w,r,0,,n,g'
      let fn = { cb: nullFn }
      chai.spy.on(fn, 'cb')
      chai.spy.on(bleno, 'disconnect')
      ble.onGetContractAddress(req, null, null, fn.cb)
      expect(fn.cb).to.have.been.called.with(config.codes.INVALID_JSON_IN_REQUEST)
      setTimeout(() => {
        expect(bleno.disconnect).to.have.been.called()
        done()
      }, 500)
    })
  })

  // --------------------------------- onGetContract -----------------------------------------------
  describe('onGetContract', () => {
    let req
    let ethDb
    let mockContract

    before(() => {
      req = wallet.signing.signMsg(keystore, account.key, util.getPinSafe(true), address)
      req = JSON.stringify(req)
      mockContract = { _id: hexAddress, contractAddress: deployed.address }
    })
    // Clear state, set a contract to find, & mock updateValueCallback
    beforeEach(() => {
      ethDb = new Pouchdb('animistEvents')
      eth.units.setDB(ethDb)
      util._units.resetSendQueue()
      defs.getContractCharacteristic.updateValueCallback = (val) => {}
      return ethDb.put(mockContract)
    })
    // Clean up
    afterEach(() => ethDb.destroy())

    it('should respond w/ RESULT_SUCCESS if a tx matching the address is found', (done) => {
      // Test: run the timeout or it will f the subsequent tests
      let cb = (code) => {
        expect(code).to.equal(config.codes.RESULT_SUCCESS)
        setTimeout(done, 55)
      }
      ble.onGetContract(req, null, null, cb)
    })

    it('should push the tx into the send queue', (done) => {
      let initialQueueSize = util._units.getSendQueue().length
      // Test
      let cb = (code) => {
        let newQueueSize = util._units.getSendQueue().length
        expect(initialQueueSize).to.equal(0)
        expect(newQueueSize).to.be.gt(0)
        setTimeout(done, 55)
      }
      ble.onGetContract(req, null, null, cb)
    })

    it('should begin writing/processing the send queue', (done) => {
      // Clean up
      util._units.resetSendQueue()
      // Test: post callback . . . in a timeout.
      let cb = (code) => {
        let fullQueue = util._units.getSendQueue()
        let fullQueueSize = fullQueue.length
        chai.spy.on(defs.getContractCharacteristic, 'updateValueCallback')
        setTimeout(() => {
          let newQueueSize = util._units.getSendQueue().length
          expect(defs.getContractCharacteristic.updateValueCallback).to.have.been.called()
          expect(newQueueSize).to.equal(fullQueueSize - 1)
          done()
        }, 55)
      }

      ble.onGetContract(req, null, null, cb)
    })

    it('should respond w/ NO_TX_DB_ERR if no rec matches the address and disconnect', (done) => {
      // Test
      let cb = (code) => {
        expect(code).to.equal(config.codes.NO_TX_DB_ERR)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 55)
      }
      // Setup & call: delete mock from contracts DB
      chai.spy.on(bleno, 'disconnect')
      ethDb.get(hexAddress)
        .then(doc => ethDb.remove(doc))
        .then(() => ble.onGetContract(req, null, null, cb))
    })

    it('should respond w/ error code if req is un-parseable and disconnect', (done) => {
      // Test
      let cb = (code) => {
        expect(code).to.equal(config.codes.INVALID_JSON_IN_REQUEST)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 500)
      }

      req = 'dd5[w,r,0,,n,g'
      chai.spy.on(bleno, 'disconnect')
      ble.onGetContract(req, null, null, cb)
    })
  })

  // ------------------------------ onGetContractIndicate ------------------------------------------
  describe('onGetContractIndicate', () => {
    // Run getContractWrite: Clear state & mock updateValueCallback
    beforeEach(() => {
      util._units.resetSendQueue()
      defs.getContractCharacteristic.updateValueCallback = (val) => {}
      util.queueContract(config.fakeTx)
    })

    it('should de-queue & send the next packet', (done) => {
      let queue = util._units.getSendQueue()
      let initialQueueSize = queue.length
      let initialQueueElement = queue[0]

      chai.spy.on(defs.getContractCharacteristic, 'updateValueCallback')
      ble.onGetContractIndicate()
      setTimeout(() => {
        queue = util._units.getSendQueue()
        expect(defs.getContractCharacteristic.updateValueCallback).to.have.been.called.with(initialQueueElement)
        expect(queue.length).to.equal(initialQueueSize - 1)
        done()
      }, 0)
    })

    it('should send EOF signal if queue is empty', (done) => {
      let expected = new Buffer(config.codes.EOF)

      chai.spy.on(defs.getContractCharacteristic, 'updateValueCallback')
      util._units.resetSendQueue()
      ble.onGetContractIndicate()
      setTimeout(() => {
        expect(defs.getContractCharacteristic.updateValueCallback).to.have.been.called.with(expected)
        done()
      }, 10)
    })

    it('should disconnect post-EOF', (done) => {
      // Run EOF
      util._units.resetSendQueue()
      ble.onGetContractIndicate()
      setTimeout(() => {
        // Post EOF
        chai.spy.on(bleno, 'disconnect')
        chai.spy.on(defs.getContractCharacteristic, 'updateValueCallback')
        ble.onGetContractIndicate()
        setTimeout(() => {
          expect(defs.getContractCharacteristic.updateValueCallback).not.to.have.been.called()
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 0)
      }, 0)
    })
  })

  describe('generatePublicationHandler() [returned handler behavior tests] ', () => {
    let data
    let args

    beforeEach(() => {
      // Mocks
      let pin = util.getPinSafe(true)
      let msgHash = web3.sha3(pin)
      let signed = web3.eth.sign(client, msgHash)
      data = JSON.stringify(signed)
      args = {message: 'hello'}
    })

    afterEach(() => ble._units.setEth(eth))

    it('should respond w/ RESULT_SUCCESS', (done) => {
      let characteristic = { updateValueCallback: (sent) => setTimeout(() => done(), 55) }
      let mockEth = {
        isAuthorizedToReadMessage: (args, val) => true,
        confirmMessageDelivery: (args, address) => {}
      }
      ble._units.setEth(mockEth)

      // Test
      let cb = (val) => expect(val).to.equal(config.codes.RESULT_SUCCESS)
      // Call
      let handler = ble.generatePublicationHandler(args, characteristic)
      handler(data, null, null, cb)
    })

    it('should invoke confirmMessageDelivery on the contract', (done) => {
      let cb = val => {}
      let characteristic = {updateValueCallback: (sent) => {}}

      // Test
      let mockEth = {
        isAuthorizedToReadMessage: (args, val) => true,
        confirmMessageDelivery: (args_, client_) => {
          args_.should.deep.equal(args)
          client_.should.equal(client)
          done()
        }
      }
      // Setup & Call
      ble._units.setEth(mockEth)
      let handler = ble.generatePublicationHandler(args, characteristic)
      handler(data, null, null, cb)
    })

    it('should send client the message and disconnect', (done) => {
      let mockEth = {
        isAuthorizedToReadMessage: (args, val) => true,
        confirmMessageDelivery: (args, address) => {}
      }

      // Test
      let characteristic = { updateValueCallback: (val) => {
        expect(Buffer.isBuffer(val)).to.be.true
        val = JSON.parse(val)
        val.should.equal(args.message)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 55)
      }}
      // Setup & Call
      ble._units.setEth(mockEth)
      chai.spy.on(bleno, 'disconnect')
      let handler = ble.generatePublicationHandler(args, characteristic)
      handler(data, null, null, nullFn)
    })

    it('should respond w/ INVALID_JSON_IN_REQUEST if signed pin is bad and disconnect', (done) => {
      let badRequest = 'dd5[w,r,0,,n,g'
      let characteristic = {updateValueCallback: (sent) => {}}
      let mockEth = {
        isAuthorizedToReadMessage: (args, val) => true,
        confirmMessageDelivery: (args, address) => {}
      }
      // Test
      let cb = (val) => {
        expect(val).to.equal(config.codes.INVALID_JSON_IN_REQUEST)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 55)
      }
      // Setup & Call
      ble._units.setEth(mockEth)
      chai.spy.on(bleno, 'disconnect')
      let handler = ble.generatePublicationHandler(args, characteristic)
      handler(badRequest, null, null, cb)
    })

    it('should respond w/ NOT_AUTHORIZED if client not authed to read msg and disconnect', (done) => {
      let characteristic = {updateValueCallback: (sent) => {}}

      // Test
      let cb = (val) => {
        expect(val).to.equal(config.codes.NOT_AUTHORIZED)
        setTimeout(() => {
          expect(bleno.disconnect).to.have.been.called()
          done()
        }, 55)
      }

      // Setup & Call
      let mockEth = {
        isAuthorizedToReadMessage: (args, val) => false, // Not authorized
        confirmMessageDelivery: (args, address) => {}
      }
      ble._units.setEth(mockEth)
      chai.spy.on(bleno, 'disconnect')
      let handler = ble.generatePublicationHandler(args, characteristic)
      handler(data, null, null, cb)
    })

    it('should work as expected: e2e')
  })
})
