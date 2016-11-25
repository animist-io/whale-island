'use strict'

// --------------------------------------- Imports -------------------------------------------------
// Local
let config = require('../lib/config.js')
const eth = require('../lib/eth.js')
const account = require('../test/mocks/wallet.js')
const transactions = require('../test/mocks/transaction.js')

// Ethereum
const util = require('ethereumjs-util')
const wallet = require('eth-lightwallet')
const Web3 = require('web3')
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider)

// DB
const Pouchdb = require('pouchdb')

// Testing
const chai = require('chai')
const spies = require('chai-spies')
const chaiAsPromised = require('chai-as-promised')

// --------------------------------------- Setup ---------------------------------------------------
const expect = chai.expect
chai.use(spies)
chai.use(chaiAsPromised)
chai.should()

// --------------------------------------- Tests ---------------------------------------------------
describe('Eth Client', function () {
  var keystore
  var address
  var hexAddress
  var deployed
  var goodTx
  var callGetVerified

  before(() => {
    // Prep a single keystore/account for all eth-lightwallet tests
    let json = JSON.stringify(account.keystore)
    keystore = wallet.keystore.deserialize(json)
    keystore.generateNewAddress(account.key, 1)
    address = keystore.getAddresses()[0]    // Lightwallets addresses are not prefixed.
    hexAddress = util.addHexPrefix(address) // Eth's are - we recover them as this.

    // Deploy TestContract, compose some signed transactions for rawTx submission.
    return transactions.generate().then(mock => {
      deployed = mock.deployed                // TestContract.sol deployed to test-rpc
      goodTx = mock.goodTx                    // raw: TestContract.set(2, {from: client})
      callGetVerified = mock.callGetVerified  // raw: call getState
    })
  })

  // -----------------------------------------------------------------------------------------------
  // ----------------------------------       Utilities    -----------------------------------------
  // -----------------------------------------------------------------------------------------------
  //
  describe('Utilities', () => {
    describe('recover(rawMsg, signed)', () => {
      it('should extract and return string address from signed message', () => {
        let msg = 'message'
        let signed = wallet.signing.signMsg(keystore, account.key, msg, address)
        eth.recover(msg, signed).should.equal(hexAddress)
      })

      it('should return null if the rawMsg is null', () => {
        let msg = 'message'
        let rawMsg = null
        let signed = wallet.signing.signMsg(keystore, account.key, msg, address)
        expect(eth.recover(rawMsg, signed)).to.equal(null)
      })

      it('should return undefined if address unrecoverable (ethjs-util throws error)', () => {
        let err = eth.recover('a message', 'kfdlskdlf')
        expect(err).to.equal(null)
      })
    })
  })

  // -----------------------------------------------------------------------------------------------
  // ----------------------------------        Core       ------------------------------------------
  // -----------------------------------------------------------------------------------------------
  describe('API', () => {
    let db

    // DB creation and cleanup
    beforeEach(() => {
      db = new Pouchdb('animistEvents')
      eth.units.setDB(db)
    })

    afterEach(() => { return db.destroy() })

    // ----------------------------------- getBlockNumber ------------------------------------------
    describe('getBlockNumber', () => {
      it('should return the current blockNumber', () => {
        eth.getBlockNumber().should.equal(web3.eth.blockNumber)
      })
    })

    describe('getAccountBalance', () => {
      it('should return string repr. the current balance of the account in wei', () => {
        let account = web3.eth.accounts[3]
        let expected = web3.eth.getBalance(account).toString()
        let result = eth.getAccountBalance(account)
        expect(result).to.equal(expected)
      })

      it('should return string repr. 0 wei from a non-existent account', () => {
        let account = '0x4dea71bde50f23d347d6b21e18c50f02221c50ae'
        let expected = '0'
        let result = eth.getAccountBalance(account)
        expect(result).to.equal(expected)
      })
    })

    // ------------------------------------ callTx -------------------------------------------------
    describe('callTx', () => {
      it('should return the value string returned by the call', () => {
        // Testing getVerified in contract Test from mocks.
        // (should return 'true')
        let data = { to: callGetVerified[0], data: callGetVerified[1] }
        let result = eth.callTx(data)
        expect(typeof result).to.equal('string')
        expect(util.isHexPrefixed(result)).to.be.true
        expect(Boolean(result)).to.be.true
      })

      it('should return "0x" if the eth.call fails', () => {
        // Corrupt 'data'
        let data = { to: callGetVerified[0], data: callGetVerified[0] }
        let result = eth.callTx(data)
        expect(result).to.equal('0x')
      })
    })

    // ------------------------------------- getTx -------------------------------------------------
    describe('getTx', () => {
      let accounts = web3.eth.accounts

      it('should resolve tx data', () => {
        let txHash = web3.eth.sendTransaction({ from: accounts[0], to: accounts[1], value: 100 })
        return eth.getTx(txHash).then(tx => {
          tx.blockNumber.should.be.a('number')
          tx.nonce.should.be.a('number')
          tx.gas.should.be.a('number')
        })
      })

      it('should reject w/ NO_TX_DB_ERR if tx not found', () => {
        let txHash = '0x000000000000000012345'
        return eth.getTx(txHash).catch(err => err.should.equal(config.codes.NO_TX_DB_ERR))
      })
    })

    // ----------------------------------- getContract ---------------------------------------------
    describe('getContract(pin, signed)', () => {
      let pin
      let signed

      before(() => {
        pin = '1234'
        signed = wallet.signing.signMsg(keystore, account.key, pin, address)
      })

      it('should resolve a contract object matching the acct. address', (done) => {
        let mock = { _id: hexAddress, contractAddress: deployed.address }
        let expected = {
          contractAddress: deployed.address,
          code: web3.eth.getCode(deployed.address)
        }
        db.put(mock).then(() => {
          eth.getContract(pin, signed).should.eventually.include(expected).notify(done)
        })
      })

      it('should reject if it cant find a contract matching the acct. address', (done) => {
        let mock = { _id: 'do_not_exist', contract: '12345' }
        db.put(mock).then(() => {
          eth.getContract(pin, signed).should.eventually.be.rejected.notify(done)
        })
      })

      it('should reject if unable to extract an address from the signed msg', () => {
        let garbage = 'garbage'
        return eth.getContract(pin, garbage).should.eventually.be.rejected
      })
    })

    // --------------------------------- getContractAddress ----------------------------------------
    describe('getContractAddress(pin, signed)', () => {
      let pin
      let signed

      before(() => {
        pin = '1234'
        signed = wallet.signing.signMsg(keystore, account.key, pin, address)
      })

      it('should resolve a contract object matching the acct. address', (done) => {
        let mock = { _id: hexAddress, contractAddress: deployed.address }
        let expected = deployed.address

        db.put(mock).then(() => {
          eth.getContractAddress(pin, signed).should.eventually.equal(expected).notify(done)
        })
      })

      it('should reject if it cant find a contract matching the acct. address', (done) => {
        let mock = { _id: 'do_not_exist', contract: '12345' }
        db.put(mock).then(() => {
          eth.getContractAddress(pin, signed).should.eventually.be.rejected.notify(done)
        })
      })

      it('should reject if unable to extract an address from the signed msg', () => {
        let garbage = 'garbage'
        return eth.getContractAddress(pin, garbage).should.eventually.be.rejected
      })
    })

    // ----------------------------------- verifyPresence ------------------------------------------
    describe('verifyPresence(pin, signed)', () => {
      let pin
      let signed
      let msgHash
      let client = web3.eth.accounts[0]

      // Sign a pin using web3 signing methods.
      before(() => {
        pin = '1234'
        msgHash = util.addHexPrefix(util.sha3(pin).toString('hex'))
        signed = web3.eth.sign(client, msgHash)
      })

      it('should call contracts verifyPresence method and resolve a valid tx hash', (done) => {
        let tx
        let blockBefore = web3.eth.blockNumber
        let contractAddress = deployed.address
        let mock = { _id: client, authority: client, contractAddress: contractAddress }

        db.put(mock).then(() => {
          eth.verifyPresence(pin, signed).then(result => {
            tx = web3.eth.getTransaction(result)
            tx.hash.should.equal(result)
            tx.blockNumber.should.equal(blockBefore + 1)
            done()
          })
        })
      })

      it('should reject if it cant find a contract matching the acct. address', (done) => {
        let mock = { _id: 'does_not_exist', authority: hexAddress, contractAddress: '12345' }

        db.put(mock).then(() => {
          eth.verifyPresence(pin, signed).should.eventually.be.rejected.notify(done)
        })
      })

      it('should reject if unable to extract an address from the signed msg', () => {
        let garbage = 'garbage'
        return eth.verifyPresence(pin, garbage).should.eventually.be.rejected
      })
    })

    // ------------------------------- verifyPresenceAndSendTx -------------------------------------
    describe('sendTxWhenPresenceVerified(verifyPresenceTxHash, signedTx, address)', () => {
      let pin
      let signed
      let msgHash
      let verifyPresenceTxHash
      let client = web3.eth.accounts[0]

      // Debugging . . . duplicate recs getting stuck in db
      before(() => {
        let ethDb = new Pouchdb('animistEvents')
        return ethDb.destroy()
      })

      beforeEach(() => {
        // Sign a pin using web3 signing methods.
        pin = '1234'
        msgHash = util.addHexPrefix(util.sha3(pin).toString('hex'))
        signed = web3.eth.sign(client, msgHash)

        // verifyPresence, get verifyPresenceTxHash.
        let mock = { _id: client, authority: client, contractAddress: deployed.address }
        return db.put(mock).then(res => {
          return eth.verifyPresence(pin, signed).then(result => { verifyPresenceTxHash = result })
        })
      })

      it('should update the contract record to show presenceVerifiedStatus as "pending" ', (done) => {
        let defaultCycles = config.MAX_CONFIRMATION_CYCLES
        let defaultMining = config.MINING_CHECK_INTERVAL

        eth.units.setConfCycles(0) // Don't even check conf.
        eth.units.setMiningCheckInterval(10) // Fast!

        // This should get called in the conf. cycles check block.
        let cb = () => {
          db.get(client).then(doc => {
            expect(doc.verifyPresenceStatus).to.equal('pending')
            expect(doc.verifyPresenceTxHash).to.equal(verifyPresenceTxHash)
            expect(doc.clientTxHash).to.equal(null)
            // Clean-up
            eth.units.setConfCycles(defaultCycles)
            eth.units.setMiningCheckInterval(defaultMining)
            done()
          })
        }

        eth.sendTxWhenPresenceVerified(verifyPresenceTxHash, goodTx, client, cb)
      })

      it('should send the tx when verifyPresence tx is mined, save its txHash and update verifyPresence status', (done) => {
        let defaultMining = config.MINING_CHECK_INTERVAL
        eth.units.setMiningCheckInterval(2000) //

        // This should get called post db update on success.
        let cb = () => {
          db.get(client).then(doc => {
            expect(doc.verifyPresenceStatus).to.equal('success')
            expect(doc.verifyPresenceTxHash).to.equal(verifyPresenceTxHash)

            // Don't really know what this is, so check form.
            expect(util.isHexPrefixed(doc.clientTxHash)).to.be.true
            expect(doc.clientTxHash.length).to.equal(0x42)

            // Clean up
            eth.units.setMiningCheckInterval(defaultMining)
            done()
          })
        }

        eth.sendTxWhenPresenceVerified(verifyPresenceTxHash, goodTx, client, cb)
      })

      it('should continue cycling while verifyPresenceTx is pending', (done) => {
        let defaultCycles = config.MAX_CONFIRMATION_CYCLES
        let defaultMining = config.MINING_CHECK_INTERVAL
        eth.units.setConfCycles(2) // Cycle a couple times
        eth.units.setMiningCheckInterval(10) // Fast!

        // Mock pending verifyPresence tx by mocking web3 local to eth.js
        let localWeb3 = eth.units.getWeb3()
        let originalGetTx = localWeb3.eth.getTransaction
        localWeb3.eth.getTransaction = (hash) => { return { blockNumber: null } }

        let cb = (waitCycles) => {
          db.get(client).then(doc => {
            expect(waitCycles).to.be.gt(0)
            expect(doc.verifyPresenceStatus).to.equal('pending')
            expect(doc.verifyPresenceTxHash).to.equal(verifyPresenceTxHash)
            expect(doc.clientTxHash).to.equal(null)

            // Clean-up
            localWeb3.eth.getTransaction = originalGetTx
            eth.units.setConfCycles(defaultCycles)
            eth.units.setMiningCheckInterval(defaultMining)
            done()
          })
        }

        eth.sendTxWhenPresenceVerified(verifyPresenceTxHash, goodTx, client, cb)
      })

      it('should set records verifyPresence status to "failed" if verifyPresence throws', (done) => {
        let gasLimit = 90000 // Default test-rpc limit

        // Speed up mine.
        let defaultMining = config.MINING_CHECK_INTERVAL
        eth.units.setMiningCheckInterval(1000) //

        // Mock a verifyPresenceTx that used gasLimit gas.
        let localWeb3 = eth.units.getWeb3()
        let originalGetTx = localWeb3.eth.getTransactionReceipt
        localWeb3.eth.getTransactionReceipt = (hash) => { return { gasUsed: gasLimit } }

        let cb = () => {
          db.get(client).then(doc => {
            expect(doc.verifyPresenceStatus).to.equal('failed')
            expect(doc.verifyPresenceTxHash).to.equal(verifyPresenceTxHash)
            expect(doc.clientTxHash).to.equal(null)

            // Clean-up
            localWeb3.eth.getTransactionReceipt = originalGetTx
            eth.units.setMiningCheckInterval(defaultMining)
            done()
          })
        }
        eth.sendTxWhenPresenceVerified(verifyPresenceTxHash, goodTx, client, cb)
      })
    })

    // ------------------------------- isAuthorizedToReadMessage -----------------------------------
    describe('isAuthorizedToReadMessage', () => {
      let args
      let node = web3.eth.accounts[0]
      let client = web3.eth.accounts[1]

      it('should return true if contract says client can read published message', () => {
        args = {
          node: node,
          uuid: 'abcd',
          message: 'hello',
          expires: 12345,
          contractAddress: deployed.address
        }

        deployed.setAuthorizedClient(client, { from: node })
        eth.isAuthorizedToReadMessage(args, client).should.be.true
      })
      it('should return false if client not authorized by contract', () => {
        let unauthorizedClient = web3.eth.accounts[2]

        args = {
          node: node,
          uuid: 'abcd',
          message: 'hello',
          expires: 12345,
          contractAddress: deployed.address
        }

        deployed.setAuthorizedClient(client, { from: node })
        client.should.not.equal(unauthorizedClient)
        eth.isAuthorizedToReadMessage(args, unauthorizedClient).should.be.false
      })

      it('should return false if the contractAddress is bad', () => {
        args = {
          node: node,
          uuid: 'abcd',
          message: 'hello',
          expires: 12345,
          contractAddress: node // Not a contract address
        }

        deployed.setAuthorizedClient(client, { from: node })
        eth.isAuthorizedToReadMessage(args, client).should.be.false
      })
    })

    // ------------------------------- confirmMessageDelivery -------------------------------------
    describe('confirmMessageDelivery', () => {
      let node = web3.eth.accounts[0]
      let client = web3.eth.accounts[1]

      it('should invoke client contracts confirmMessageDelivery method and return true', () => {
        let args = {
          node: node,
          uuid: 'abcd',
          message: 'hello',
          expires: 12345,
          contractAddress: deployed.address
        }

        deployed.setAuthorizedClient(client, { from: node })
        deployed.setMessageDelivered(false, { from: node })
        let returnVal = eth.confirmMessageDelivery(args, client)
        deployed.getMessageDelivered().should.be.true
        returnVal.should.be.true
      })
    })
  })
})

