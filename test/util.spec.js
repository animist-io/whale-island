'use strict'

// ---------------------------------------- Imports ------------------------------------------------
// Local
let config = require('../lib/config')
let util = require('../lib/util')

// Mocks
const account = require('../test/mocks/wallet')
const transactions = require('../test/mocks/transaction')

// Ethereum
const Web3 = require('web3')
const wallet = require('eth-lightwallet')

// Testing
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

// ----------------------------------------- Setup -------------------------------------------------
const expect = chai.expect
chai.use(chaiAsPromised)

const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider)

// ----------------------------------------- Tests -------------------------------------------------
describe('BLE Utilites', () => {
  let keystore
  let address
  let goodTx
  let badTx
  let client = web3.eth.accounts[0]

  before(() => {
    // Don't clear the pin
    util._units.setPinResetInterval(500000)

    // Prep an eth-lightwallet keystore/account for pin signing tests
    let json = JSON.stringify(account.keystore)
    keystore = wallet.keystore.deserialize(json)
    keystore.generateNewAddress(account.key, 1)
    address = keystore.getAddresses()[0]    // Lightwallets addresses are not prefixed.

    // Deploy TestContract, compose some signed transactions for rawTx submission.
    return transactions.generate().then(deployed => {
      goodTx = deployed.goodTx                // raw: TestContract.set(2, {from: client})
      badTx = deployed.badTx                  // raw: goodTx but sent with 0 gas.
    })
  })

  // ------------------------------------queueContract ---------------------------------------------
  describe('queueContract(tx)', () => {
    it('should transform input into buffers of MAX_SIZE & queue them', () => {
      // Testing 11 chars (including "" from JSON stringify) /4 byte packets:
      let tx = '123412341'
      let defaultConfig = config.MAX_SEND
      config.MAX_SEND = 4

      util.queueContract(tx)
      let queue = util._units.getSendQueue()

      expect(queue.length).to.equal(3)
      expect(Buffer.isBuffer(queue[0])).to.be.true
      expect(queue[2].length).to.equal(3)

      // Testing 3 chars (including "" from JSON stringify) /4 byte packets:
      tx = '1'
      util._units.resetSendQueue()
      util.queueContract(tx)
      queue = util._units.getSendQueue()

      expect(queue.length).to.equal(1)
      expect(queue[0].length).to.equal(3)

      // Cleanup
      config.MAX_SEND = defaultConfig
    })
  })

  // --------------------------------------- decrypt -----------------------------------------------
  describe('decrypt()', () => {
    it('should decrypt a message correctly', () => {
      let msg = 'hello'

      return util.encrypt(msg, config.publicKey).then(encrypted => {
        return expect(util.decrypt(encrypted)).to.eventually.equal(msg)
      })
    })
  })

  // ---------------------------------------  getPin -----------------------------------------------
  describe('getPin(true)', () => {
    it('should generate a new Pin', () => {
      let oldPin = util.getPin(true)
      let newPin = util.getPin(true)

      expect(typeof oldPin).to.equal('string')
      expect(oldPin.length).to.equal(32)
      expect(oldPin).not.to.equal(newPin)
    })

    it('should automatically clear pin after PIN_RESET_INTERVAL ms', (done) => {
      util._units.setPinResetInterval(10)

      setTimeout(() => {
        expect(util.getPin()).to.equal(null)
        util._units.setPinResetInterval(500000)
        done()
      }, 15)

      util.getPin(true)
    })

    it('should NOT clear the pin if a method requests pin before PIN_RESET_INTERVAL', (done) => {
      util._units.setPinResetInterval(10)

      setTimeout(() => {
        expect(util.getPin()).to.equal(pin)
        util._units.setPinResetInterval(500000)
        done()
      }, 15)

      let pin = util.getPin(true) // Get initial pin w/ generate flag set to true
      util.getPin()                // Emulate a method requesting the current pin
    })
  })

  // --------------------------------------- resetPin ----------------------------------------------
  describe('resetPin', () => {
    it('should clear the old pin', () => {
      util.getPin(true)
      util.resetPin()
      expect(util.getPin()).to.equal(null)
    })
  })

  // -------------------------------------- parseCall ----------------------------------------------
  describe('parseCall', () => {
    it('should return ok and an object with "to" and "data" fields if input valid', () => {
      // Everything ok.
      let item1 = '0x253...eee'
      let item2 = '0xf087407379e66de3...000'
      let expected = {ok: true, val: {to: item1, data: item2}}
      let data = JSON.stringify([item1, item2])
      let output = util.parseCall(data)
      expect(output).to.deep.equal(expected)
    })

    it('should return w/ error code if input is not JSON parseable', () => {
      // Data not JSON stringified.
      let item1 = '0x253...eee'
      let item2 = '0xf087407379e66de3...000'
      let data = [item1, item2]
      let expected = {ok: false, val: config.codes.INVALID_CALL_DATA}
      let output = util.parseCall(data)
      expect(output).to.deep.equal(expected)
    })

    it('should return w/ error code if input is not array of length 2, hex strings', () => {
      // Data not hex
      let item1 = '253...eee'
      let item2 = 'f087407379e66de3...000'
      let data = JSON.stringify([item1, item2])
      let expected = {ok: false, val: config.codes.INVALID_CALL_DATA}
      let output = util.parseCall(data)
      expect(output).to.deep.equal(expected)
    })
  })

  // ---------------------------------- parseSignedPin ---------------------------------------------
  describe('parseSignedPin(signed)', () => {
    it('should return usable object repr. a signed msg if input is form { v: r: s: }', () => {
      let msg = 'a message'
      let req = wallet.signing.signMsg(keystore, account.key, msg, address)
      let output = util.parseSignedPin(JSON.stringify(req))

      expect(output.ok).to.be.true
      expect(typeof output.val).to.equal('object')
      expect(Buffer.isBuffer(output.val.r)).to.be.true
      expect(Buffer.isBuffer(output.val.s)).to.be.true
    })

    it('should return usable string repr. a signed msg if input is form "0x923 . . ."', () => {
      let msg = util.getPin(true)
      let msgHash = web3.sha3(msg)
      let signed = web3.eth.sign(client, msgHash)
      let input = JSON.stringify(signed)
      let output = util.parseSignedPin(input)

      expect(output.ok).to.be.true
      expect(output.val).to.equal(signed)
    })

    it('should return error if input is object and not parse-able as a signed msg', () => {
      let req = JSON.stringify({ signed: 'I am not signed' })
      let output = util.parseSignedPin(req)
      expect(output.ok).to.equal(false)
      expect(output.val).to.equal(config.codes.NO_SIGNED_MSG_IN_REQUEST)
    })

    it('should return error if input is string and not hex-prefixed', () => {
      let req = 'dd5[w,r,0,,n,g'
      let output = util.parseSignedPin(req)
      expect(output.ok).to.equal(false)
      expect(output.val).to.equal(config.codes.INVALID_JSON_IN_REQUEST)
    })
  })

  // ------------------------------------ parseSignedTx --------------------------------------------
  describe('parseSignedTx(data, client)', () => {
    let pin = 0

    it('should extract and return a signed tx string from the data input', () => {
      let data = JSON.stringify({ pin: pin, tx: goodTx })
      let output = util.parseSignedTx(data, client)
      expect(output.ok).to.be.true
      expect(output.val).to.equal(goodTx)
    })

    it('should error w/ INVALID_PIN if the client address is malformed', () => {
      // Good data, client address is error code
      let data = JSON.stringify({ pin: pin, tx: goodTx })
      let output = util.parseSignedTx(data, 0x02)
      expect(output.ok).to.be.false
      expect(output.val).to.equal(config.codes.INVALID_TX_SENDER_ADDRESS)
    })

    it('should error w/ INVALID_JSON_IN_REQUEST if data is not parse-able as object', () => {
      let data = JSON.stringify('not an object')
      let output = util.parseSignedTx(data, client)
      expect(output.ok).to.be.false
      expect(output.val).to.equal(config.codes.INVALID_JSON_IN_REQUEST)
    })

    it('should error w/ INVALID_JSON_IN_REQUEST if data obj does not have a "tx" key', () => {
      let data = JSON.stringify({no_tx: 'hello!'})
      let output = util.parseSignedTx(data, client)
      expect(output.ok).to.be.false
      expect(output.val).to.equal(config.codes.INVALID_JSON_IN_REQUEST)
    })

    it('should error w/ INVALID_JSON_IN_REQUEST if data.tx is not a string', () => {
      let data = JSON.stringify({tx: 12345})
      let output = util.parseSignedTx(data, client)
      expect(output.ok).to.be.false
      expect(output.val).to.equal(config.codes.INVALID_JSON_IN_REQUEST)
    })

    it('should error w/ INVALID_TX_SENDER_ADDRESS if tx sender is not client', () => {
      // Mock tx's are signed with accounts[0]
      let data = JSON.stringify({pin: pin, tx: goodTx})
      let output = util.parseSignedTx(data, web3.eth.accounts[2])
      expect(output.ok).to.be.false
      expect(output.val).to.equal(config.codes.INVALID_TX_SENDER_ADDRESS)
    })

    it('should error w/ INSUFFICIENT_GAS if tx gas limit too low', () => {
      let data = JSON.stringify({pin: pin, tx: badTx})
      let output = util.parseSignedTx(data, web3.eth.accounts[0])
      expect(output.ok).to.be.false
      expect(output.val).to.equal(config.codes.INSUFFICIENT_GAS)
    })

    // it('should error w/ INSUFFICIENT_BALANCE if tx sender cant afford gas', ()=> {
    // // Mock tx's are signed with accounts[0]
    //    data = JSON.stringify({pin: pin, tx: brokeTx});
    //    output = util.parseSignedTx(data, web3.eth.accounts[4]);
    //    expect(output.ok).to.be.false;
    //    expect(output.val).to.equal(config.codes.INSUFFICIENT_BALANCE);
    // });
  })

  // ------------------------------------ parseTxHash ----------------------------------------------
  describe('parseTxHash(hash)', () => {
    it('should return an object containing a correctly formatted txHash', () => {
      let hash = '0xf087407379e66de3d69da365826272f7750e6c978f5c2d034296de168f571e4d'
      let input = JSON.stringify(hash)
      let output = util.parseTxHash(input)
      expect(output.ok).to.be.true
      expect(output.val).to.equal(hash)
    })

    it('should error w/ INVALID_TX_HASH if input is not a string', () => {
      let hash = '{ hello: "I am not a string" }'
      let input = JSON.stringify(hash)
      let output = util.parseTxHash(input)
      expect(output.ok).to.be.false
      expect(output.val).to.equal(config.codes.INVALID_TX_HASH)
    })

    it('should error w/ INVALID_TX_HASH if input is not hex prefixed', () => {
      let hash = 'f087407379e66de3d69da365826272f7750e6c978f5c2d034296de168f571e4d'
      let input = JSON.stringify(hash)
      let output = util.parseTxHash(input)
      expect(output.ok).to.be.false
      expect(output.val).to.equal(config.codes.INVALID_TX_HASH)
    })

    it('should error w/ INVALID_TX_HASH if input does not repr. 32bytes', () => {
      let hash = '0xf087407379e66de3d69da365826272f7750e6c978f5c2d034296de168f'
      let input = JSON.stringify(hash)
      let output = util.parseTxHash(input)
      expect(output.ok).to.be.false
      expect(output.val).to.equal(config.codes.INVALID_TX_HASH)
    })
  })

  // ------------------------------------- parseAddress --------------------------------------------
  describe('parseAddress', () => {
    it('should return ok with a valid account address', () => {
      let address = '0x4dea71bde50f23d347d6b21e18c50f02221c50ad'
      let input = JSON.stringify(address)
      let expected = {ok: true, val: address}
      let output = util.parseAddress(input)
      expect(output).to.deep.equal(expected)
    })

    it('should return err if account address malformed', () => {
      let address = '4dea71bde50f23d347d6b21e18c50f02221c50ad'
      let input = JSON.stringify(address)
      let expected = {ok: false, val: config.codes.NO_TX_ADDR_ERR}
      let output = util.parseAddress(input)
      expect(output).to.deep.equal(expected)
    })
  })
})
