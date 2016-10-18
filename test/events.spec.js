"use strict"

let config = require('../lib/config.js');
const events = require('../lib/events.js');
const transaction = require('../test/mocks/transaction.js');
const mocks = require('../test/mocks/event.js');

// Ethereum
const util = require('ethereumjs-util');
const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider('http://localhost:8545');
const web3 = new Web3(provider);

// Contracts
const newContract = require('eth-new-contract').default(provider);
const contracts = require('../contracts/Test.js');

// DB
const pouchdb = require('pouchdb');
const upsert = require('pouchdb-upsert');
pouchdb.plugin(upsert);

// Testing
const chai = require('chai');
const spies = require('chai-spies');
const chaiAsPromised = require("chai-as-promised");

// ----------------------------------- Setup -----------------------------------------

const expect = chai.expect;
chai.use(spies);
chai.use(chaiAsPromised);
chai.should();

// ----------------------------------- Tests -----------------------------------------
describe('Ethereum Contract Event Listeners', () => {

    var node = web3.eth.accounts[0];
    var client = web3.eth.accounts[1];
    var client2 = web3.eth.accounts[2];

    var testContract;
    var defaultBroadcastDuration = config.MIN_BROADCAST_DURATION;

    before(() => {

        //transaction.eventsABI();

        return newContract( contracts.Test, { from: client })
                .then( deployed => testContract = deployed )
    });

    describe('isValidDuration', ()=>{

        it('should return true for a valid duration', ()=>{
            let duration = new util.BN(1000)
            events.isValidDuration(duration).should.be.true;
        });

        it('should return false if duration out of bounds', ()=>{
            let duration = new util.BN(100)
            events.isValidDuration(duration).should.be.false;
        });

    });

    describe('isValidMessage', ()=> {

        it('should return true if content is valid', ()=>{
            events.isValidMessage('hello').should.be.true;
        });

        it('should return false if content is a null string', ()=>{
            events.isValidMessage('').should.be.false;
        });

        it('should return false if content size is > allowed by config', ()=>{
            events.isValidMessage(mocks.messageTooLong).should.be.false;
        })  

    });

    describe('isValidUUID', ()=>{

        after(() => events._units.clearBroadcasts() )

        it('should return true if uuid is valid', ()=> {
            let uuid = "C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8";
            events.isValidUUID(uuid).should.be.true;
        });

        it('should return false if uuid is malformed', ()=> {
            let uuid = "12355641";
            events.isValidUUID(uuid).should.be.false;

        });

        it('should return false if theres already a broadcast w/ same uuid', ()=>{

            let uuid = mocks.broadcast_1.args.uuid;
            events.addPublication(mocks.broadcast_1);
            events.isValidUUID(uuid).should.be.false;

        })
    })

    describe('isValidMessagePublicationEvent', ()=>{

        let eventContract;

        beforeEach( () => {
            events._units.clearBroadcasts();
            return newContract( contracts.AnimistEvent, { from: client })
                .then( deployed => eventContract = deployed )
        })

        it('should validate message publication contract events', (done)=>{

            let now = web3.eth.blockNumber;
            let uuid = "C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8";
            let message = "hello";
            let duration = "2000";

            eventContract.LogMessagePublicationRequest({node: node}, {fromBlock: now, toBlock: now + 1}, (err, res) => {
                events.isValidMessagePublicationEvent(res).should.be.true;
                done();
            });

            eventContract.requestMessagePublication( node, uuid, message, duration, {from: client})

        });

        it('should return false if channel uuid is malformed', (done) =>{

            let now = web3.eth.blockNumber;
            let bad_uuid = "C6FEDFFF";
            let message = "hello";
            let duration = "2000";

            eventContract.LogMessagePublicationRequest({node: node}, {fromBlock: now, toBlock: now + 1}, (err, res) => {
                events.isValidMessagePublicationEvent(res).should.be.false;
                done();
            });

            eventContract.requestMessagePublication( node, bad_uuid, message, duration, {from: client})

        });

        it('should return false if content is invalid', (done) => {

            let now = web3.eth.blockNumber;
            let uuid = "C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8";
            let bad_message = mocks.messageTooLong;
            let duration = "2000";

            eventContract.LogMessagePublicationRequest({node: node}, {fromBlock: now, toBlock: now + 1}, (err, res) => {
                events.isValidMessagePublicationEvent(res).should.be.false;
                done();
            });

            eventContract.requestMessagePublication( node, uuid, bad_message, duration, {from: client})

        });

        it('should return false if duration is invalid', (done) => {
            let now = web3.eth.blockNumber;
            let uuid = "C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8";
            let message = "hello";
            let bad_duration = "99";

            eventContract.LogMessagePublicationRequest({node: node}, {fromBlock: now, toBlock: now + 1}, (err, res) => {
                events.isValidMessagePublicationEvent(res).should.be.false;
                done();
            });

            eventContract.requestMessagePublication( node, uuid, message, bad_duration, {from: client})
        });
    });

    describe('isValidPresenceVerificationEvent', ()=>{

        let eventContract;

        before( () => {
            return newContract( contracts.AnimistEvent, { from: client })
                .then( deployed => eventContract = deployed )
        })

        it('should validate presence verfication contract events', (done)=>{

            let now = web3.eth.blockNumber;
             
            eventContract.LogPresenceVerificationRequest({node: node}, {fromBlock: now, toBlock: now + 1}, (err, res) => {
                events.isValidPresenceVerificationEvent(res).should.be.true;
                done();
            });

            eventContract.requestPresenceVerification( node, client, testContract.address, {from: client})
        });

    });

    describe('getLastSavedBlock', ()=>{

        let db;

        // DB creation and cleanup
        beforeEach( () => { 
            db = new pouchdb('proximityContracts'); 
        });

        afterEach(() => { return db.destroy() });

        it('should return the value of a DBs "lastBlock" rec', ()=>{

            let expected = 12345
            return db.put({ _id: "lastBlock", val: expected }).then( doc => {
                return events.getLastSavedBlock(db).should.eventually.equal(expected);
            }).catch(err => console.log(err));
        });

        it('should return devices "genesis block" if DB is empty', ()=>{
            let expected = config.deviceGenesisBlock;
            return events.getLastSavedBlock(db).should.eventually.equal(expected);
        });
    });

    describe('saveBlock', ()=>{

        let db;

        after(() => { return db.destroy() });

        it('should update a DBs "lastBlock" rec', ()=>{
            let expected = 12345;
            db = new pouchdb('proximityContracts'); 

            return events.saveBlock(db, expected ).then( doc => {
                return events.getLastSavedBlock(db).should.eventually.equal(expected);
            })
        })
    });

    describe('addPresenceVerificationRequest', () => {
        let db; 
        after(() => db.destroy());

        it('should add event to the proximityEvents db', ()=> {

            db = new pouchdb('proximityContracts'); 
            events._units.setDB(db);

            let mockEvent = mocks.detectionRequestEvent;
            let expectedID = mockEvent.args.account;
            let expectedContract = mockEvent.args.contractAddress;

            return events.addPresenceVerificationRequest(mocks.detectionRequestEvent)
                .then( val => db.get(expectedID)
                .then( doc => doc.contractAddress.should.equal(expectedContract) 
            ))

        });
    });

    describe('addPublication', () => {

        // Mock broadcasts only have a 10ms duration. 
        before(() => config.MIN_BROADCAST_DURATION = 0 );
        after(() => config.MIN_BROADCAST_DURATION = defaultBroadcastDuration );

        it('should create a bleno characteristic and add it to the characteristics array', (done)=>{
    
            chai.spy.on(bleno, 'disconnect');
        
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
            broadcasts[0].onReadRequest(null, cb);            // Test callback  

        });

        it('should stop broadcasting request after specified duration', (done)=> {

            events.addPublication(mocks.broadcast_1);
            events._units.getBroadcasts().length.should.equal(1);

            setTimeout(() => {
                events._units.getBroadcasts().length.should.equal(0);
                done();
            }, 100)

        });
    });


    describe('startPresenceVerificationRequestsFilter', ()=>{

        let eventContract, db;

        // Deploy contract, create DB and make block current.
        beforeEach( () => { 
            
            return newContract( contracts.AnimistEvent, { from: client })
                .then( deployed => {
                    eventContract = deployed; 
                    db = new pouchdb('proximityContracts'); 
                    events._units.setDB(db);
                    return events.saveBlock(db, web3.eth.blockNumber + 1);
                })
        });

        afterEach(() => { return db.destroy() });

        it('should begin saving presence verification reqs for this node that are logged to the blockchain', (done)=>{

            let cb = () => {
        
                db.get(client)
                    .then( () => done())
                    .catch( err => { true.should.be.false; done() });
            }

            events.startPresenceVerificationRequestsFilter( eventContract.address, cb ).then( () => {
                eventContract.requestPresenceVerification( node, client, testContract.address, {from: client});
            })
            
        });
        it('should update the "lastBlock" record the proximityContracts DB after saving each request', (done)=>{

            let currentBlock = web3.eth.blockNumber;
           
            let cb = () => {
                db.get('lastBlock')
                    .then( doc => { doc.val.should.be.gt(currentBlock); done() })
                    .catch( err => { true.should.be.false; done() });
            }

            events.startPresenceVerificationRequestsFilter( eventContract.address, cb ).then( () => {
                eventContract.requestPresenceVerification( node, client2, testContract.address, {from: client});
            })
        });     
    });

    describe('startMessagePublicationRequestsFilter', () => {

        let eventContract, db;

        // Deploy contract
        beforeEach( () => { 
            events._units.clearBroadcasts();
            return newContract( contracts.AnimistEvent, { from: client })
                .then( deployed => eventContract = deployed )
        });

        it('should begin broadcasting any msg publication reqs for this node that are logged to the blockchain', (done)=>{

            let uuid = "C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8";
            let expected_uuid = uuid.replace(/-/g, '');
            let message = "hello";
            let duration = "2000";

            let cb = () => {
                events._units.getBroadcasts().length.should.equal(1);
                events._units.getBroadcasts()[0].uuid.should.equal(expected_uuid);
                done();
            }

            events.startMessagePublicationRequestsFilter( eventContract.address, web3.eth.blockNumber + 1, cb );
            eventContract.requestMessagePublication( node, uuid, message, duration, {from: client});

        });

    });
});