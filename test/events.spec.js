"use strict"

let config = require('../lib/config.js');
const events = require('../lib/events.js');
const transaction = require('../test/mocks/transaction.js');
const mocks = require('../test/mocks/event.js');
const server = require('../lib/server.js');
const requestableBeacon = require('../lib/requestableBeacon.js');

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
const assert = chai.assert;
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

    describe('isValidExpirationDate', ()=>{

        it('should return true for a valid expiration date', ()=>{

            let expires = new util.BN( Date.now() + 5000 )
            events.isValidExpirationDate(expires).should.be.true;
        });

        it('should return false if expiration date is before now', ()=>{
            let expires = new util.BN( Date.now() - 5000)
            events.isValidExpirationDate(expires).should.be.false;
        });

        it('should return false for BN values larger than 53bits (Max safe val JS)', () => {
            // This oversize # grabbed from the BN test suite
            let expires = new util.BN(1).iushln(54);
            events.isValidExpirationDate(expires).should.be.false;

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

    describe('isValidMessagePublicationEvent', ()=>{

        let eventContract;

        beforeEach( () => {
            return newContract( contracts.AnimistEvent, { from: client })
                .then( deployed => eventContract = deployed )
        })

        it('should validate message publication contract events', (done)=>{

            let now = web3.eth.blockNumber;
            let uuid = "C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8";
            let message = "hello";
            let expires = Date.now() + 5000;

            eventContract.LogMessagePublicationRequest({node: node}, {fromBlock: now, toBlock: now + 1}, (err, res) => {
                events.isValidMessagePublicationEvent(res).should.be.true;
                done();
            });

            eventContract.requestMessagePublication( node, uuid, message, expires, {from: client})

        });

        it('should return false if publication uuid is malformed', (done) =>{

            let now = web3.eth.blockNumber;
            let bad_uuid = "C6FEDFFF";
            let message = "hello";
            let expires = Date.now() + 5000;

            eventContract.LogMessagePublicationRequest({node: node}, {fromBlock: now, toBlock: now + 1}, (err, res) => {
                events.isValidMessagePublicationEvent(res).should.be.false;
                done();
            });

            eventContract.requestMessagePublication( node, bad_uuid, message, expires, {from: client})

        });

        it('should return false if content is invalid', (done) => {

            let now = web3.eth.blockNumber;
            let uuid = "C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8";
            let bad_message = mocks.messageTooLong;
            let expires = Date.now() + 5000;

            eventContract.LogMessagePublicationRequest({node: node}, {fromBlock: now, toBlock: now + 1}, (err, res) => {
                events.isValidMessagePublicationEvent(res).should.be.false;
                done();
            });

            eventContract.requestMessagePublication( node, uuid, bad_message, expires, {from: client})

        });

        it('should return false if expiration date is invalid', (done) => {
            let now = web3.eth.blockNumber;
            let uuid = "C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8";
            let message = "hello";
            let expired = Date.now() - 5000;

            eventContract.LogMessagePublicationRequest({node: node}, {fromBlock: now, toBlock: now + 1}, (err, res) => {
                events.isValidMessagePublicationEvent(res).should.be.false;
                done();
            });

            eventContract.requestMessagePublication( node, uuid, message, expired, {from: client})
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
            db = new pouchdb('animistEvents'); 
            events._units.setDB(db);

        });

        afterEach(() => { return db.destroy() });

        it('should return the value of a DBs "lastBlock" rec', ()=>{

            let expected = 12345
            return db.put({ _id: "lastBlock", val: expected }).then( doc => {
                return events.getLastSavedBlock().should.eventually.equal(expected);
            }).catch(err => console.log(err));
        });

        it('should return devices "genesis block" if DB is empty', ()=>{
            let expected = config.deviceGenesisBlock;
            return events.getLastSavedBlock().should.eventually.equal(expected);
        });
    });

    describe('saveBlock', ()=>{

        let db;

        after(() => { return db.destroy() });

        it('should update a DBs "lastBlock" rec', ()=>{
            let expected = 12345;
            db = new pouchdb('animistEvents'); 
            events._units.setDB(db);

            return events.saveBlock(expected).then( doc => {
                return events.getLastSavedBlock().should.eventually.equal(expected);
            })
        })
    });

    describe('addPresenceVerificationRequest', () => {
        let db; 
        after(() => db.destroy());

        it('should add event to the proximityEvents db', ()=> {

            db = new pouchdb('animistEvents'); 
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

    describe('startPresenceVerificationRequestsFilter', ()=>{

        let eventContract, db;

        // Deploy contract, create DB and make block current.
        beforeEach( () => { 
            
            return newContract( contracts.AnimistEvent, { from: client })
                .then( deployed => {
                    eventContract = deployed; 
                    db = new pouchdb('animistEvents'); 
                    events._units.setDB(db);
                    return events.saveBlock(web3.eth.blockNumber + 1);
                })
        });

        afterEach(() => { return db.destroy() });

        it('should begin saving presence verification reqs for this node that are logged to the blockchain', (done)=>{

            let cb = () => {
        
                db.get(client)
                    .then( () => done())
                    .catch( err => { true.should.be.false; done() });
            }

            events.startPresenceVerificationRequestsFilter( eventContract.address, cb )
            eventContract.requestPresenceVerification( node, client, testContract.address, {from: client});

        });
        it('should update the "lastBlock" record the animistEvents DB after saving each request', (done)=>{

            let currentBlock = web3.eth.blockNumber;
           
            let cb = () => {
                db.get('lastBlock')
                    .then( doc => { doc.val.should.be.gt(currentBlock); done() })
                    .catch( err => { true.should.be.false; done() });
            }

            events.startPresenceVerificationRequestsFilter( eventContract.address, cb )
            eventContract.requestPresenceVerification( node, client2, testContract.address, {from: client});

        });     
    });

    describe('startBeaconBroadcastRequestsFilter', ()=>{

        let eventContract;

        // Deploy contract
        beforeEach( () => { 
            return newContract( contracts.AnimistEvent, { from: client })
                .then( deployed => eventContract = deployed );
        });

        it('should NOT submit a signed beacon id if the beacon uuid doesnt validate', (done) => {

            let uuid = "I am bad";
            let cb = (err) => {
                if (err) {
                    err.should.equal(config.events.filters.validationError);
                    requestableBeacon.addBeacon.should.not.have.been.called();
                    events.stopBeaconFilter();
                    done();
                }   
            }

            chai.spy.on(requestableBeacon, 'addBeacon');
            events.startBeaconBroadcastRequestsFilter(eventContract.address, requestableBeacon.addBeacon, cb);
            eventContract.requestBeaconBroadcast(node, uuid, testContract.address, {from: client}); 
        });

        it('should submit a verifiably signed beacon id to the client contract', (done) => {

            let receivedBeacon, uuid = "C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8";

            // Construct received Beacon
            requestableBeacon.addBeacon = (uuid, major, minor)=> {
                receivedBeacon = uuid + ':' + major + ':' + minor;
                return Promise.resolve();
            };
            
            // Run solidity test that uses received beacon to ecrecover the node address.
            let cb = (err) => {
                if (err) return;
               
                testContract.receivedBeaconMatchesSignedBeacon(receivedBeacon, node).should.be.true;
                events.stopBeaconFilter();
                done();
            }

            events.startBeaconBroadcastRequestsFilter(eventContract.address, requestableBeacon.addBeacon, cb);
            eventContract.requestBeaconBroadcast(node, uuid, testContract.address, {from: client});        
        });
    });

    /*describe.only('eth_sign bug', () => {
        it('should work', ()=>{
            var msg = "3c9229289a6125f7fdf1885a77bb12c37a8d3b4962d936f7e3084dece32a3ca1";
            var msgHash = util.bufferToHex( util.sha3(msg) );
            var signed = web3.eth.sign( web3.eth.accounts[0], msgHash);
            assert.equal(signed.length, 132 ) 
        });

        it('will fail', ()=> {
            var msg = "558d2681eeb61e8bd3ee590aa624a6739caf9bef529a3f6e63dc54459be3ebd1"
            var msgHash = util.bufferToHex( util.sha3(msg) );
            var signed = web3.eth.sign( web3.eth.accounts[0], msgHash);
            assert.equal(signed.length, 132 ) 
        })
    });*/

    describe('startMessagePublicationRequestsFilter', () => {

        let eventContract, db;

        // Deploy contract
        beforeEach( () => { 
            return newContract( contracts.AnimistEvent, { from: client })
                .then( deployed => {
                    eventContract = deployed; 
                    db = new pouchdb('animistEvents'); 
                    events._units.setDB(db);
                    return events.saveBlock(web3.eth.blockNumber + 1);
                })
        });

        afterEach(() => { return db.destroy() });

        it('should pass valid event data to "addPublication" callback', (done)=>{

            let args = {
                node: node,
                uuid: "C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8",
                message: "hello",
                expires: Date.now() + 5000
            }
            
            chai.spy.on( server, 'addPublication');

            let cb = () => {
                server.addPublication.should.have.been.called.with(args);
                done();
            }

            events.startMessagePublicationRequestsFilter( eventContract.address, server.addPublication, cb );
            eventContract.requestMessagePublication( node, args.uuid, args.message, args.expires, {from: client});

        });

        it('should NOT pass invalid event data to "addPublication" callback', (done)=>{

            let args = {
                node: node,
                uuid: "C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8",
                message: "hello",
                expires: 5000
            }
            
            chai.spy.on( server, 'addPublication');

            let cb = (err) => {
                server.addPublication.should.not.have.been.called();
                err.should.equal(config.events.filters.validationError);
                done();
            }
            events.startMessagePublicationRequestsFilter( eventContract.address, server.addPublication, cb );
            eventContract.requestMessagePublication( node, args.uuid, args.message, args.expires, {from: client});

        });

        it('should update the "lastBlock" record the animistEvents DB after saving each request', (done)=>{

            let currentBlock = web3.eth.blockNumber;
            let args = {
                node: node,
                uuid: "C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8",
                message: "hello",
                expires: Date.now() + 5000
            };
            
            let cb = () => {
                db.get('lastBlock')
                    .then( doc => { doc.val.should.be.gt(currentBlock); done() })
                    .catch( err => { true.should.be.false; done() });
            }

            events.startMessagePublicationRequestsFilter( eventContract.address, server.addPublication, cb );
            eventContract.requestMessagePublication( node, args.uuid, args.message, args.expires, {from: client});
        });   
    });

    
});