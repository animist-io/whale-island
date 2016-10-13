"use strict"

let config = require('../lib/config.js');
const events = require('../lib/events.js');
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

    describe('isValidBroadcastEvent', ()=>{

        let eventContract;

        beforeEach( () => {
            return newContract( contracts.AnimistEvent, { from: client })
                .then( deployed => eventContract = deployed )
        })

        it('should validate broadcast contract events', (done)=>{

            let now = web3.eth.blockNumber;
            let uuid = "C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8";
            let message = "hello";
            let duration = "2000";

            eventContract.LogBroadcastRequest({node: node}, {fromBlock: now, toBlock: now + 1}, (err, res) => {
                events.isValidBroadcastEvent(res).should.be.true;
                done();
            });

            eventContract.requestBroadcast( node, uuid, message, duration, {from: client})

        });

        it('should return false if channel uuid is malformed', (done) =>{

            let now = web3.eth.blockNumber;
            let bad_uuid = "C6FEDFFF";
            let message = "hello";
            let duration = "2000";

            eventContract.LogBroadcastRequest({node: node}, {fromBlock: now, toBlock: now + 1}, (err, res) => {
                events.isValidBroadcastEvent(res).should.be.false;
                done();
            });

            eventContract.requestBroadcast( node, bad_uuid, message, duration, {from: client})

        });

        it('should return false if content is invalid', (done) => {

            let now = web3.eth.blockNumber;
            let uuid = "C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8";
            let bad_message = mocks.messageTooLong;
            let duration = "2000";

            eventContract.LogBroadcastRequest({node: node}, {fromBlock: now, toBlock: now + 1}, (err, res) => {
                events.isValidBroadcastEvent(res).should.be.false;
                done();
            });

            eventContract.requestBroadcast( node, uuid, bad_message, duration, {from: client})

        });

        it('should return false if duration is invalid', (done) => {
            let now = web3.eth.blockNumber;
            let uuid = "C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8";
            let message = "hello";
            let bad_duration = "99";

            eventContract.LogBroadcastRequest({node: node}, {fromBlock: now, toBlock: now + 1}, (err, res) => {
                events.isValidBroadcastEvent(res).should.be.false;
                done();
            });

            eventContract.requestBroadcast( node, uuid, message, bad_duration, {from: client})
        });
    });

    describe('isValidProximityEvent', ()=>{

        let eventContract;

        before( () => {
            return newContract( contracts.AnimistEvent, { from: client })
                .then( deployed => eventContract = deployed )
        })

        it('should validate proximity contract events', (done)=>{

            let now = web3.eth.blockNumber;
             
            eventContract.LogProximityDetectionRequest({node: node}, {fromBlock: now, toBlock: now + 1}, (err, res) => {
                events.isValidProximityEvent(res).should.be.true;
                done();
            });

            eventContract.requestProximityDetection( node, client, testContract.address, {from: client})
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

    describe('addProximityDetectionRequest', () => {
        let db; 
        after(() => db.destroy());

        it('should add event to the proximityEvents db', ()=> {

            db = new pouchdb('proximityContracts'); 
            events._units.setDB(db);

            let mockEvent = mocks.detectionRequestEvent;
            let expectedID = mockEvent.args.account;
            let expectedContract = mockEvent.args.contractAddress;

            return events.addProximityDetectionRequest(mocks.detectionRequestEvent)
                .then( val => db.get(expectedID)
                .then( doc => doc.contractAddress.should.equal(expectedContract) 
            ))

        });
    });

    describe('addBroadcast', () => {

        // Mock broadcasts only have a 10ms duration. 
        before(() => config.MIN_BROADCAST_DURATION = 0 );
        after(() => config.MIN_BROADCAST_DURATION = defaultBroadcastDuration );

        it('should create a bleno characteristic and add it to the characteristics array', (done)=>{
    
            chai.spy.on(bleno, 'disconnect');
        
            let expectedChannel = mocks.broadcast_1.args.channel.replace(/-/g, '');
            let expectedMessage = new Buffer(mocks.broadcast_1.args.message);
            let broadcasts = events.addBroadcast(mocks.broadcast_1);
    
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

            events.addBroadcast(mocks.broadcast_1);
            events._units.getBroadcasts().length.should.equal(1);

            setTimeout(() => {
                events._units.getBroadcasts().length.should.equal(0);
                done();
            }, 100)

        });
    });


    describe('startProximityDetectionRequestsFilter', ()=>{

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

        it('should begin saving proximity detection reqs for this node logged to the blockchain', (done)=>{

            let cb = () => {
        
                db.get(client)
                    .then( () => done())
                    .catch( err => { true.should.be.false; done() });
            }

            events.startProximityDetectionRequestsFilter( eventContract.address, cb ).then( () => {
                eventContract.requestProximityDetection( node, client, testContract.address, {from: client});
            })
            
        });
        it('should update the "lastBlock" record the proximityContracts DB after saving each request', (done)=>{

            let currentBlock = web3.eth.blockNumber;
           
            let cb = () => {
                db.get('lastBlock')
                    .then( doc => { doc.val.should.be.gt(currentBlock); done() })
                    .catch( err => { true.should.be.false; done() });
            }

            events.startProximityDetectionRequestsFilter( eventContract.address, cb ).then( () => {
                eventContract.requestProximityDetection( node, client2, testContract.address, {from: client});
            })
        });     
    });

    describe('startBroadcastRequestsFilter', () => {

        it('should begin broadcasting any broadcast reqs for this node logged to the blockchain');
        it('should upate the "lastBlock" record of the broadcastContracts DB after each request');
    });
});