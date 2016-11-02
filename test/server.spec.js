'use strict'

// Local
let config = require('../lib/config');
const server = require('../lib/server.js');

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

    describe('prepPublicationsOnLaunch', () => {

        let db;
        beforeEach( () => { 
            db = new pouchdb('animistEvents'); 
            server._units.setDB(db);
        });

        afterEach(() => { return db.destroy() });

        it('should remove expired publications from the events DB', (done) => {
            let list = [];
            let charA = new bleno.Characteristic({ uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C'});
            let charB = new bleno.Characteristic({ uuid: '22222222-A4F6-4E98-AA15-F9E070EB105C'});
            
            list.push({characteristic: charA, expires: Date.now() + 1000000 });
            list.push({characteristic: charA, expires: Date.now() - 1000000 });
            
            db.put({ _id: 'publications', list: list })
                .then( res => server.prepPublicationsOnLaunch()
                .then( res => db.get('publications')
                .then( doc => {
                        doc.list.length.should.equal(1);
                        doc.list[0].characteristic.uuid.should.equal(charA.uuid);
                        done();
                })))
                .catch(err => console.log(err));
        });

        it('should correctly schedule the removal of existing publications in the DB', (done)=>{
            let list = [];
            let charA = new bleno.Characteristic({ uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C'});
            let charB = new bleno.Characteristic({ uuid: '22222222-A4F6-4E98-AA15-F9E070EB105C'});
            
            list.push({characteristic: charA, expires: Date.now() + 500 });
            list.push({characteristic: charB, expires: Date.now() + 1000000 });
            
            db.put({ _id: 'publications', list: list })
                .then( res => server.prepPublicationsOnLaunch()
                .then( res => 
                    setTimeout(() => {
                        db.get('publications').then( doc => {
                            doc.list.length.should.equal(1);
                            doc.list[0].characteristic.uuid.should.equal(charB.uuid);
                            done();
                        }).catch( err => console.log(err))
                    }, 550)
                ))
                .catch(err => console.log(err));
        });

        it('should ensure the publication set is correct: e2e');
    });

    describe('isUniqueUUID', ()=>{

        let characteristics = [];
        before(() => {

            let charA = new bleno.Characteristic({ uuid: '11111111-A4F6-4E98-AA15-F9E070EB105C'});
            let charB = new bleno.Characteristic({ uuid: '22222222-A4F6-4E98-AA15-F9E070EB105C'});
            characteristics.push(charA);
            characteristics.push(charB);
        });

        it('should return true if the uuid doesnt exist in the publication set', ()=>{
            let uuid = '33333333-A4F6-4E98-AA15-F9E070EB105C';
            server.isUniqueUUID( uuid, characteristics ).should.be.true;
        });

        it('should return false if theres already a publication w/ same uuid', ()=>{
            let uuid = '22222222-A4F6-4E98-AA15-F9E070EB105C';
            server.isUniqueUUID( uuid, characteristics).should.be.false;
        });
    })

    describe('addPublication', () => {

        it('should create a bleno characteristic and add it the DBs publications list');
    
            /*chai.spy.on(bleno, 'disconnect');
        
            let expectedChannel = mocks.broadcast_1.args.uuid.replace(/-/g, '');
            let expectedMessage = new Buffer(mocks.broadcast_1.args.message);
            let broadcasts = events.addPublication(mocks.broadcast_1);
    
            let cb = (code, response) => {

                code.should.equal(config.codes.RESULT_SUCCESS);
                Buffer.isBuffer(response).should.be.true;
                response.equals(expectedMessage).should.be.true;

                setTimeout(() => {
                    bleno.disconnect.should.have.been.called();
                    done();
                }, 100 );
            }

            broadcasts[0].uuid.should.equal(expectedChannel); // Verify uuid
            broadcasts[0].onReadRequest(null, cb);            // Test callback*/  


        it('should schedule publication removal correctly');

            /*events.addPublication(mocks.broadcast_1);
            events._units.getBroadcasts().length.should.equal(1);

            setTimeout(() => {
                events._units.getBroadcasts().length.should.equal(0);
                done();
            }, 100)*/

        it('should update the broadcast');
        
    });

    describe('updateBroadcast', () => {

        it('should call Bleno setServices with the correct set of default/requested characteristics');
        it('should call Bleno setServices with the default char set if eventsDB is empty');
    });

    describe('onAdvertisingStart', () => {

        it('should set up the publications correctly, start broadcasting, and begin filtering for events');

    });

});