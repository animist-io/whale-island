'use strict'

// Local
let config = require('../lib/config')
const serverlib = require('../lib/server')
const handlers = require('../lib/handlers')

// Mocks
const bleno = require('../test/mocks/bleno.js')

// DB
const Pouchdb = require('pouchdb')
const upsert = require('pouchdb-upsert')
Pouchdb.plugin(upsert)

// Testing
const chai = require('chai')

// ----------------------------------------- Tests -------------------------------------------------
describe('BLE Server', () => {
  // ------------------------------------- isUniqueUUID --------------------------------------------
  describe('isUniqueUUID', () => {
    let characteristics = []

    before(() => {
      let charA = { uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C' }
      let charB = { uuid: '22222222-A4F6-4E98-AA15-F9E070EB105C' }
      characteristics.push(charA)
      characteristics.push(charB)
    })

    it('should return true if the uuid doesnt exist in the publication set', () => {
      let uuid = '33333333-A4F6-4E98-AA15-F9E070EB105C'
      serverlib.isUniqueUUID(uuid, characteristics).should.be.true
    })

    it('should return false if theres already a publication w/ same uuid', () => {
      let uuid = '22222222-A4F6-4E98-AA15-F9E070EB105C'
      serverlib.isUniqueUUID(uuid, characteristics).should.be.false
    })
  })

  // ------------------------------- prepPublicationsOnLaunch --------------------------------------
  describe('prepPublicationsOnLaunch', () => {
    let db

    beforeEach(() => {
      db = new Pouchdb('animistEvents')
      serverlib._units.setDB(db)
    })

    afterEach(() => db.destroy())

    it('should remove expired publications from the events DB', (done) => {
      let list = []
      let charA = { uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C', expires: Date.now() + 1000000 }
      let charB = { uuid: '22222222-A4F6-4E98-AA15-F9E070EB105C', expires: Date.now() - 1000000 }

      list.push(charA)
      list.push(charB)

      db.put({ _id: 'publications', list: list })
        .then(res => serverlib.prepPublicationsOnLaunch()
        .then(res => db.get('publications')
        .then(doc => {
          doc.list.length.should.equal(1)
          doc.list[0].uuid.should.equal(charA.uuid)
          done()
        })))
    })

    it('should correctly schedule the removal of existing publications in the DB', (done) => {
      let list = []
      let charA = { uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C', expires: Date.now() + 500 }
      let charB = { uuid: '22222222-A4F6-4E98-AA15-F9E070EB105C', expires: Date.now() + 1000000 }

      list.push(charA)
      list.push(charB)

      db.put({ _id: 'publications', list: list })
        .then(res => serverlib.prepPublicationsOnLaunch()
        .then(res =>
          setTimeout(() => {
            db.get('publications').then(doc => {
              doc.list.length.should.equal(1)
              doc.list[0].uuid.should.equal(charB.uuid)
              done()
            }).catch( (err) =>{console.log(err); done()})
          }, 1000)
        ))
    })

    it('should ensure the publication set is correct: e2e')
  })

  // ------------------------------------- addPublication ------------------------------------------
  describe('addPublication', () => {
    let db
    let server
    beforeEach(() => {
      server = new serverlib.AnimistServer()
      db = new Pouchdb('animistEvents')
      serverlib._units.setDB(db)
    })

    afterEach(() => db.destroy())

    it('should add event to the DBs publications list (initializing)', (done) => {
      let args = {
        uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C',
        message: 'hello',
        expires: Date.now() + 100000,
        contractAddress: '0x1234567'
      }

      server.addPublication(args)
        .then(res => db.get('publications')
        .then(doc => {
          doc.list[0].should.deep.equal(args)
          done()
        }))
    })

    it('should add event to the DBs publications list (initialized)', (done) => {
      let args1 = {
        uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C',
        message: 'hello',
        expires: Date.now() + 100000,
        contractAddress: '0x1234567'
      }
      let args2 = {
        uuid: '22222222-A4F6-4E98-AA15-F9E070EB105C',
        message: 'hello again from a different uuid',
        expires: Date.now() + 100000,
        contractAddress: '0x1234567'
      }

      server.addPublication(args1)
        .then(res => server.addPublication(args2)
        .then(res => db.get('publications')
        .then(doc => {
          doc.list.length.should.equal(2)
          doc.list[1].message.should.equal(args2.message)
          done()
        })))
    })

    it('should should not add duplicate publications', (done) => {
      let args1 = {
        uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C',
        message: 'hello',
        expires: Date.now() + 100000,
        contractAddress: '0x1234567'
      }
      let args2 = {
        uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C',
        message: 'hello again from the SAME uuid',
        expires: Date.now() + 100000,
        contractAddress: '0x1234567'
      }

      server.addPublication(args1)
        .then(res => server.addPublication(args2)
        .then(res => db.get('publications')
        .then(doc => {
          doc.list.length.should.equal(1)
          doc.list[0].message.should.equal(args1.message)
          done()
        })))
    })

    it('should schedule publication removal correctly', (done) => {
      let args = {
        uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C',
        message: 'hello',
        expires: Date.now() + 500,
        contractAddress: '0x1234567'
      }

      server.addPublication(args).then(res =>
        setTimeout(() => {
          db.get('publications').then(doc => {
            doc.list.length.should.equal(0)
            done()
          }).catch((err) => {console.log(err); done()})
        }, 1000)
      )
    })

    it('should update the broadcast', (done) => {
      let args = {
        uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C',
        message: 'hello',
        expires: Date.now() + 100000,
        contractAddress: '0x1234567'
      }

      chai.spy.on(server, 'updateBroadcast')
      server.addPublication(args).then(res => {
        server.updateBroadcast.should.have.been.called()
        done()
      }).catch(err => console.log(err))
    })
  })

  // ------------------------------------- updateBroadcast -----------------------------------------
  describe('updateBroadcast', () => {
    let db
    let server

    beforeEach(() => {
      server = new serverlib.AnimistServer()
      db = new Pouchdb('animistEvents')
      serverlib._units.setDB(db)
    })

    afterEach(() => db.destroy())

    it('should call Bleno setServices with correct default/requested characteristics', (done) => {
      let args = {
        uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C',
        message: 'hello',
        expires: Date.now() + 100000,
        contractAddress: '0x1234567'
      }
      let list = []
      let expLength = server.defaultCharacteristics.length + 1
      let expChar = new bleno.Characteristic({ uuid: args.uuid, properties: ['write'] })
      let expFn = handlers.generatePublicationHandler(args, expChar).toString()

      list.push(args)

      db.put({_id: 'publications', list: list})
        .then(res => server.updateBroadcast()
        .then(res => {
          server.service.characteristics.length.should.equal(expLength)
          server.service.characteristics[expLength - 1].uuid.should.equal(args.uuid.replace(/-/g, ''))
          let actualFn = server.service.characteristics[expLength - 1].onWriteRequest.toString()
          actualFn.should.equal(expFn)
          done()
        }))
        .catch(err => console.log(err))
    })

    it('should call Bleno setServices with the default char set if eventsDB is empty', (done) => {
      let expLength = server.defaultCharacteristics.length
      let expUuid = server.defaultCharacteristics[0].uuid

      server.updateBroadcast().then(res => {
        server.service.characteristics.length.should.equal(expLength)
        server.service.characteristics[0].uuid.should.equal(expUuid)
        done()
      })
      .catch(err => console.log(err))
    })
  })

  // ---------------------------------- onAdvertisingStart -----------------------------------------
  describe('onAdvertisingStart', () => {
    let server
    let db

    beforeEach(() => {
      server = new serverlib.AnimistServer()
      db = new Pouchdb('animistEvents')
      serverlib._units.mockEventsModule()
      serverlib._units.setDB(db)
      serverlib._units.suppressTerminal()
    })

    afterEach(() => db.destroy())

    it('should begin broadcasting and include any ongoing publications from the DB', (done) => {
      let list = []
      let args = { uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C', expires: Date.now() + 1000000 }
      let expLength = server.defaultCharacteristics.length + 1

      list.push(args)
      db.put({ _id: 'publications', list: list })
        .then(res => server._units.onAdvertisingStart()
        .then(res => {
          server.service.characteristics.length.should.equal(expLength)
          server.service.characteristics[expLength - 1].uuid.should.equal(args.uuid.replace(/-/g, ''))
          done()
        }))
    })

    it('should begin filtering for events', (done) => {
      let events = serverlib._units.getEventsModule()

      chai.spy.on(events, 'startMessagePublicationRequestsFilter')
      chai.spy.on(events, 'startPresenceVerificationRequestsFilter')

      server._units.onAdvertisingStart().then(res => {
        events.startMessagePublicationRequestsFilter.should.have.been.called.with(
          config.eventsContractAddress,
          server.addPublication
        )
        events.startPresenceVerificationRequestsFilter.should.have.been.called.with(
          config.eventsContractAddress
        )
        done()
      }).catch(e => console.log('error at spec: ' + e))
    })
  })
})
