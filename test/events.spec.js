'use strict'

let config = require('../lib/config.js')
const events = require('../lib/events.js')
const mocks = require('../test/mocks/event.js')
const requestableBeacon = require('../lib/requestableBeacon.js')

// Ethereum
const util = require('ethereumjs-util')
const Web3 = require('web3')
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider)

// Contracts
const newContract = require('eth-new-contract').default(provider)
const contracts = require('../contracts/Test.js')

// DB
const Pouchdb = require('pouchdb')
const upsert = require('pouchdb-upsert')
Pouchdb.plugin(upsert)

// Testing
const chai = require('chai')
const spies = require('chai-spies')
const chaiAsPromised = require('chai-as-promised')

// --------------------------------------- Setup ---------------------------------------------------
chai.use(spies)
chai.use(chaiAsPromised)
chai.should()

// --------------------------------------- Tests ---------------------------------------------------
describe('Contract Event Listeners', () => {
  let node = web3.eth.accounts[0]
  let client = web3.eth.accounts[1]
  let client2 = web3.eth.accounts[2]
  let testContract

  before(() => {
    return newContract(contracts.Test, { from: client, gas: 3141592 })
        .then(deployed => { testContract = deployed })
  })

  // ------------------------------ isValidExpirationDate ------------------------------------------
  describe('isValidExpirationDate', () => {
    it('should return true for a valid expiration date', () => {
      let expires = new util.BN(Date.now() + 5000)
      events.isValidExpirationDate(expires).should.be.true
    })

    it('should return false if expiration date is before now', () => {
      let expires = new util.BN(Date.now() - 5000)
      events.isValidExpirationDate(expires).should.be.false
    })

    it('should return false for BN values larger than 53bits (Max safe val JS)', () => {
      // This oversize # grabbed from the BN test suite
      let expires = new util.BN(1).iushln(54)
      events.isValidExpirationDate(expires).should.be.false
    })
  })

  // -------------------------------- isValidMessage -----------------------------------------------
  describe('isValidMessage', () => {
    it('should return true if content is valid', () => {
      events.isValidMessage('hello').should.be.true
    })

    it('should return false if content is a null string', () => {
      events.isValidMessage('').should.be.false
    })

    it('should return false if content size is > allowed by config', () => {
      events.isValidMessage(mocks.messageTooLong).should.be.false
    })
  })

  // ------------------------  isValidMessagePublicationEvent --------------------------------------
  describe('isValidMessagePublicationEvent', () => {
    let eventContract

    beforeEach(() => {
      return newContract(contracts.AnimistEvent, { from: client, gas: 3141592 })
        .then(deployed => { eventContract = deployed })
    })

    it('should validate message publication contract events', (done) => {
      let now = web3.eth.blockNumber
      let uuid = 'C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8'
      let message = 'hello'
      let expires = Date.now() + 5000

      // Test in filter
      eventContract.LogMessagePublicationRequest(
          {node: node},
          {fromBlock: now, toBlock: now + 1},
          (e, res) => { events.isValidMessagePublicationEvent(res).should.be.true; done() }
      )
      // Fire event
      eventContract.requestMessagePublication(
        node,
        uuid,
        message,
        expires,
        testContract.address,
        {from: client}
      )
    })

    it('should return false if publication uuid is malformed', (done) => {
      let now = web3.eth.blockNumber
      let badUuid = 'C6FEDFFF'
      let message = 'hello'
      let expires = Date.now() + 5000

      // Test in filter
      eventContract.LogMessagePublicationRequest(
        {node: node},
        {fromBlock: now, toBlock: now + 1},
        (e, res) => {
          events.isValidMessagePublicationEvent(res).should.be.false; done()
        })
      // Fire event
      eventContract.requestMessagePublication(
        node,
        badUuid,
        message,
        expires,
        testContract.address,
        {from: client}
      )
    })

    it('should return false if content is invalid', (done) => {
      let now = web3.eth.blockNumber
      let uuid = 'C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8'
      let badMessage = mocks.messageTooLong
      let expires = Date.now() + 5000

      // Test in filter
      eventContract.LogMessagePublicationRequest(
        {node: node},
        {fromBlock: now, toBlock: now + 1},
        (e, res) => { events.isValidMessagePublicationEvent(res).should.be.false; done() }
      )
      // Fire event
      eventContract.requestMessagePublication(
        node,
        uuid,
        badMessage,
        expires,
        testContract.address,
        {from: client, gas: 3141592}
      )
    })

    it('should return false if expiration date is invalid', (done) => {
      let now = web3.eth.blockNumber
      let uuid = 'C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8'
      let message = 'hello'
      let expired = Date.now() - 5000

      // Test in filter
      eventContract.LogMessagePublicationRequest(
        {node: node},
        {fromBlock: now, toBlock: now + 1},
        (e, res) => { events.isValidMessagePublicationEvent(res).should.be.false; done() }
      )
      // Fire event
      eventContract.requestMessagePublication(
        node,
        uuid,
        message,
        expired,
        testContract.address,
        {from: client}
      )
    })
  })

  // ------------------------  isValidPresenceVerificationEvent ------------------------------------
  describe('isValidPresenceVerificationEvent', () => {
    let eventContract

    before(() => {
      return newContract(contracts.AnimistEvent, { from: client, gas: 3141592 })
        .then(deployed => { eventContract = deployed })
    })

    it('should validate presence verfication contract events', (done) => {
      let now = web3.eth.blockNumber

      eventContract.LogPresenceVerificationRequest(
        {node: node},
        {fromBlock: now, toBlock: now + 1},
        (e, res) => { events.isValidPresenceVerificationEvent(res).should.be.true; done() }
      )

      eventContract.requestPresenceVerification(
        node,
        client,
        testContract.address,
        {from: client}
      )
    })
  })

  // -----------------------------  getLastSavedBlock ----------------------------------------------
  describe('getLastSavedBlock', () => {
    let db

    // DB creation and cleanup
    beforeEach(() => {
      db = new Pouchdb('animistEvents')
      events._units.setDB(db)
    })

    afterEach(() => { return db.destroy() })

    it('should return the value of a DBs "lastBlock" rec', () => {
      let expected = 12345
      return db.put({ _id: 'lastBlock', val: expected }).then(doc => {
        return events.getLastSavedBlock().should.eventually.equal(expected)
      })
    })

    it('should return devices "genesis block" if DB is empty', () => {
      let expected = config.deviceGenesisBlock
      return events.getLastSavedBlock().should.eventually.equal(expected)
    })
  })

  // -----------------------------    saveBlock   --------------------------------------------------
  describe('saveBlock', () => {
    let db
    // Clean up
    after(() => db.destroy())

    it('should update a DBs "lastBlock" rec', () => {
      let expected = 12345
      db = new Pouchdb('animistEvents')
      events._units.setDB(db)

      return events.saveBlock(expected).then(doc => {
        return events.getLastSavedBlock().should.eventually.equal(expected)
      })
    })
  })

  // ----------------------- addPresenceVerificationRequest ----------------------------------------
  describe('addPresenceVerificationRequest', () => {
    let db
    // Clean up
    after(() => db.destroy())

    it('should add event to the proximityEvents db', () => {
      let mockEvent = mocks.detectionRequestEvent
      let expectedID = mockEvent.args.account
      let expectedContract = mockEvent.args.contractAddress
      db = new Pouchdb('animistEvents')
      events._units.setDB(db)

      return events.addPresenceVerificationRequest(mocks.detectionRequestEvent)
        .then(val => db.get(expectedID)
        .then(doc => doc.contractAddress.should.equal(expectedContract)
      ))
    })
  })

  // ------------------- startPresenceVerificationRequestsFilter -----------------------------------
  describe('startPresenceVerificationRequestsFilter', () => {
    let eventContract
    let db

    // Deploy contract, create DB and make block current.
    beforeEach(() => {
      return newContract(contracts.AnimistEvent, { from: client, gas: 3141592 })
        .then(deployed => {
          eventContract = deployed
          db = new Pouchdb('animistEvents')
          events._units.setDB(db)
          return events.saveBlock(web3.eth.blockNumber + 1)
        })
    })
    // Clean up
    afterEach(() => db.destroy())

    it('should begin saving presence verification reqs for this node', (done) => {
      // Verify that a req for client appears in db
      let cb = () => {
        db.get(client)
          .then(() => done())
          .catch(() => { true.should.be.false; done() })
      }
      events.startPresenceVerificationRequestsFilter(eventContract.address, cb)
      eventContract.requestPresenceVerification(
        node,
        client,
        testContract.address,
        {from: client}
      )
    })

    it('should update the "lastBlock" record the animistEvents DB after each request', (done) => {
      let currentBlock = web3.eth.blockNumber
      let cb = () => {
        db.get('lastBlock')
          .then(doc => { doc.val.should.be.gt(currentBlock); done() })
          .catch(() => { true.should.be.false; done() })
      }

      events.startPresenceVerificationRequestsFilter(eventContract.address, cb)
      eventContract.requestPresenceVerification(node, client2, testContract.address, {from: client})
    })
  })

  // ----------------------- startBeaconBroadcastRequestsFilter ------------------------------------
  describe('startBeaconBroadcastRequestsFilter', () => {
    let eventContract

    // Deploy contract
    beforeEach(() => {
      return newContract(contracts.AnimistEvent, { from: client, gas: 3141592 })
        .then(deployed => { eventContract = deployed })
    })

    it('should NOT submit a signed beacon id if the beacon uuid doesnt validate', (done) => {
      let uuid = 'I am bad'
      let cb = (err) => {
        if (err) {
          err.should.equal(config.events.filters.validationError)
          requestableBeacon.addBeacon.should.not.have.been.called()
          events.stopBeaconFilter()
          done()
        }
      }
      chai.spy.on(requestableBeacon, 'addBeacon')

      // Start filter
      events.startBeaconBroadcastRequestsFilter(
        eventContract.address,
        requestableBeacon.addBeacon,
        cb
      )
      // Fire event
      eventContract.requestBeaconBroadcast(
        node,
        uuid,
        testContract.address,
        {from: client}
      )
    })

    it('should submit a verifiably signed beacon id to the client contract', (done) => {
      let receivedBeacon
      let uuid = 'C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8'
      let cb = (err) => {
        if (err) return
        // Run solidity test that uses received beacon to ecrecover the node address.
        testContract.receivedBeaconMatchesSignedBeacon(receivedBeacon, node).should.be.true
        events.stopBeaconFilter()
        done()
      }
      // Construct received Beacon / Mock addBeacon method
      requestableBeacon.addBeacon = (uuid, major, minor) => {
        receivedBeacon = uuid + ':' + major + ':' + minor
        return Promise.resolve()
      }
      // Start filter
      events.startBeaconBroadcastRequestsFilter(
        eventContract.address,
        requestableBeacon.addBeacon,
        cb
      )
      // Fire event
      eventContract.requestBeaconBroadcast(
        node,
        uuid,
        testContract.address,
        {from: client}
      )
    })
  })

  // ---------------------- startMessagePublicationRequestsFilter ----------------------------------
  describe('startMessagePublicationRequestsFilter', () => {
    let eventContract
    let db

    // Deploy contract
    beforeEach(() => {
      return newContract(contracts.AnimistEvent, { from: client, gas: 3141592 })
        .then(deployed => {
          eventContract = deployed
          db = new Pouchdb('animistEvents')
          events._units.setDB(db)
          return events.saveBlock(web3.eth.blockNumber + 1)
        })
    })
    // Clean up
    afterEach(() => db.destroy())

    it('should pass valid event data to "addPublication" callback', (done) => {
      let args = {
        node: node,
        uuid: 'C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8',
        message: 'hello',
        expires: Date.now() + 5000,
        contractAddress: testContract.address
      }
      let cb = (_args) => {
        _args.should.deep.equal(args)
        done()
      }
      // Start filter
      events.startMessagePublicationRequestsFilter(eventContract.address, cb)
      // Fire event
      eventContract.requestMessagePublication(
        node,
        args.uuid,
        args.message,
        args.expires,
        testContract.address,
        {from: client, gas: 3141592}
      )
    })

    it('should NOT pass invalid event data to "addPublication" callback', (done) => {
      let args = {
        node: node,
        uuid: 'C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8',
        message: 'hello',
        expires: 5000,
        contractAddress: testContract.address
      }
      // Mock server
      let mockServer = { addPublication: args => null }
      // Test error callback
      let cb = (err) => {
        mockServer.addPublication.should.not.have.been.called()
        err.should.equal(config.events.filters.validationError)
        done()
      }

      chai.spy.on(mockServer, 'addPublication')
      // Start filter
      events.startMessagePublicationRequestsFilter(
        eventContract.address,
        mockServer.addPublication,
        cb
      )
      // Fire event
      eventContract.requestMessagePublication(
        node,
        args.uuid,
        args.message,
        args.expires,
        testContract.address,
        {from: client, gas: 3141592}
      )
    })

    it('should update the "lastBlock" record the animistEvents DB after saving each request', (done) => {
      let currentBlock = web3.eth.blockNumber
      let args = {
        node: node,
        uuid: 'C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8',
        message: 'hello',
        expires: Date.now() + 5000,
        contractAddress: testContract.address
      }
      let cb = () => {
        db.get('lastBlock')
          .then(doc => { doc.val.should.be.gt(currentBlock); done() })
          .catch(() => { true.should.be.false; done() })
      }
      // Start filter
      events.startMessagePublicationRequestsFilter(eventContract.address, cb)
      // Fire event
      eventContract.requestMessagePublication(
        node,
        args.uuid,
        args.message,
        args.expires,
        testContract.address,
        {from: client, gas: 3141592}
      )
    })
  })
})
