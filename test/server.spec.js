'use strict'

// Local
let config = require('../lib/config');
const serverlib = require('../lib/server');
const util = require('../lib/util');
const handlers = require('../lib/handlers')

// Ethereum 
const ethjs_util = require("ethereumjs-util");

// Mocks
const transactions = require('../test/mocks/transaction');
const bleno = require('../test/mocks/bleno.js');

// DB
const pouchdb = require('pouchdb');
const upsert = require('pouchdb-upsert');
pouchdb.plugin(upsert);

// Testing
const chai = require('chai');
const spies = require('chai-spies');
const chaiAsPromised = require("chai-as-promised");

describe('BLE Server', ()=>{

    describe('isUniqueUUID', ()=>{

        let characteristics = [];
        before(() => {

            let charA = { uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C'};
            let charB = { uuid: '22222222-A4F6-4E98-AA15-F9E070EB105C'};
            characteristics.push(charA);
            characteristics.push(charB);
        });

        it('should return true if the uuid doesnt exist in the publication set', ()=>{
            let uuid = '33333333-A4F6-4E98-AA15-F9E070EB105C';
            serverlib.isUniqueUUID( uuid, characteristics ).should.be.true;
        });

        it('should return false if theres already a publication w/ same uuid', ()=>{
            let uuid = '22222222-A4F6-4E98-AA15-F9E070EB105C';
            serverlib.isUniqueUUID( uuid, characteristics).should.be.false;
        });
    });

    describe('prepPublicationsOnLaunch', () => {

        let db;
        beforeEach( () => { 

            db = new pouchdb('animistEvents'); 
            serverlib._units.setDB(db);
        });

        afterEach(() => { return db.destroy() });

        it('should remove expired publications from the events DB', (done) => {
            let list = [];
            let charA = { uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C', expires: Date.now() + 1000000 };
            let charB = { uuid: '22222222-A4F6-4E98-AA15-F9E070EB105C', expires: Date.now() - 1000000 };
            
            list.push(charA);
            list.push(charB);
            
            db.put({ _id: 'publications', list: list })
                .then( res => serverlib.prepPublicationsOnLaunch()
                .then( res => db.get('publications')
                .then( doc => {
                        doc.list.length.should.equal(1);
                        doc.list[0].uuid.should.equal(charA.uuid);
                        done();
                })))
        });

        it('should correctly schedule the removal of existing publications in the DB', (done)=>{
            let list = [];
            let charA = { uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C', expires: Date.now() + 500 };
            let charB = { uuid: '22222222-A4F6-4E98-AA15-F9E070EB105C', expires: Date.now() + 1000000 };
            
            list.push(charA);
            list.push(charB);
            
            db.put({ _id: 'publications', list: list })
                .then( res => serverlib.prepPublicationsOnLaunch()
                .then( res => 
                    setTimeout(() => {
                        db.get('publications').then( doc => {
                            doc.list.length.should.equal(1);
                            doc.list[0].uuid.should.equal(charB.uuid);
                            done();
                        })
                    }, 550)
                ))
        });

        it('should ensure the publication set is correct: e2e');
    });

    describe('addPublication', () => {

        let db, server;
        beforeEach( () => { 
            server = new serverlib.AnimistServer();
            db = new pouchdb('animistEvents'); 
            serverlib._units.setDB(db);
        });

        afterEach(() => { return db.destroy() });

        it('should add event to the DBs publications list (initializing)', (done)=>{
            let args = {
                uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C',
                message: 'hello',
                expires: Date.now() + 100000,
                contractAddress: '0x1234567'
            }
        
            server.addPublication(args)
                .then( res => db.get('publications')
                .then( doc => {
                    doc.list[0].should.deep.equal(args);
                    done();
                }))
        });

        it('should add event to the DBs publications list (initialized)', (done)=> {
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
            
            .then( res => server.addPublication(args2)
            .then( res => db.get('publications')
            .then( doc => {
                    doc.list.length.should.equal(2);
                    doc.list[1].message.should.equal(args2.message);
                    done();
            })))
        });

        it('should should not add duplicate publications', (done)=>{
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
            
            .then( res => server.addPublication(args2)
            .then( res => db.get('publications')
            .then( doc => {
                doc.list.length.should.equal(1);
                doc.list[0].message.should.equal(args1.message);
                done();
            })))
        });

        it('should schedule publication removal correctly', (done) =>{
            
            let args = { 
                uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C', 
                message: 'hello',
                expires: Date.now() + 500,
                contractAddress: '0x1234567'
            }
            
            server.addPublication(args).then( res => 
                setTimeout(() => {
                    db.get('publications').then( doc => {
                        doc.list.length.should.equal(0);
                        done();
                    })
                }, 550)
            )   
        });

        it('should update the broadcast', (done) => {
            
            let args = {
                uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C',
                message: 'hello',
                expires: Date.now() + 100000,
                contractAddress: '0x1234567'
            }
        
            //server.updateBroadcast = server._units.getUpdateBroadcast();
            chai.spy.on(server, 'updateBroadcast');

            server.addPublication(args).then( res => {
                server.updateBroadcast.should.have.been.called();
                done();
            }).catch( err => console.log(err))
        });
        
    });

    describe('updateBroadcast', () => {

        let db, server;
        beforeEach( () => { 
            server = new serverlib.AnimistServer();
            db = new pouchdb('animistEvents'); 
            serverlib._units.setDB(db);
        });

        afterEach(() => { return db.destroy() });

        it('should call Bleno setServices with the correct set of default/requested characteristics', (done)=>{
            let args = {
                uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C',
                message: 'hello',
                expires: Date.now() + 100000,
                contractAddress: '0x1234567'
            }

            let list = [], actual_fn;
            let exp_length = server.defaultCharacteristics.length + 1;
            let exp_char = new bleno.Characteristic({ uuid: args.uuid, properties: ['write']});
            let exp_fn = handlers.generatePublicationHandler(args, exp_char).toString();

            list.push(args);

            db.put({_id: 'publications', list: list})
                .then(res => server.updateBroadcast()
                .then(res => {
                    server.service.characteristics.length.should.equal(exp_length);
                    server.service.characteristics[exp_length - 1].uuid.should.equal(args.uuid.replace(/-/g, ''));
                    actual_fn = server.service.characteristics[exp_length - 1].onWriteRequest.toString()
                    actual_fn.should.equal(exp_fn);
                    done();
                }))
                .catch(err =>  console.log(err));
        });

        it('should call Bleno setServices with the default char set if eventsDB is empty', (done) => {
            let exp_length = server.defaultCharacteristics.length;
            let exp_uuid = server.defaultCharacteristics[0].uuid;

            server.updateBroadcast().then(res => {
                server.service.characteristics.length.should.equal(exp_length);
                server.service.characteristics[0].uuid.should.equal(exp_uuid);
                done();
            })
            .catch(err =>  console.log(err));
        });
    });

    describe('onAdvertisingStart', () => {

        let server, db;

        beforeEach( () => { 
            server = new serverlib.AnimistServer();
            db = new pouchdb('animistEvents'); 
            
            serverlib._units.mockEventsModule();
            serverlib._units.setDB(db);
            serverlib._units.suppressTerminal();
        });

        afterEach(() => { return db.destroy() });

        it('should begin broadcasting and include any ongoing publications from the DB', (done) => {
            let list = [];
            let args = { uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C', expires: Date.now() + 1000000 };
            let exp_length = server.defaultCharacteristics.length + 1;

            list.push(args);    
            db.put({ _id: 'publications', list: list })
                .then( res => server._units.onAdvertisingStart()
                .then( res => {
                    server.service.characteristics.length.should.equal(exp_length);
                    server.service.characteristics[exp_length - 1].uuid.should.equal(args.uuid.replace(/-/g, ''));
                    done();
                }))
        });


        it('should begin filtering for events', (done)=>{
            let events = serverlib._units.getEventsModule();
            chai.spy.on(events, 'startMessagePublicationRequestsFilter');
            chai.spy.on(events, 'startPresenceVerificationRequestsFilter');

            server._units.onAdvertisingStart().then( res => {
                events.startMessagePublicationRequestsFilter.should.have.been.called.with(config.eventsContractAddress, server.addPublication );
                events.startPresenceVerificationRequestsFilter.should.have.been.called.with(config.eventsContractAddress); 
                done();       
            })
        });

    });

});