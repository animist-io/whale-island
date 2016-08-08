'use strict'

// ----------------------------------- Imports -----------------------------------------

// Local
let config = require('../lib/config');
let util = require('../lib/util')
let handlers = require('../lib/handlers');
let eth = require('../lib/eth');

// Mocks
const account = require('../test/mocks/wallet');
const transactions = require('../test/mocks/transaction');

// Ethereum 
const Web3 = require('web3');
const ethjs_util = require("ethereumjs-util");
const wallet = require('eth-lightwallet');

// Misc NPM
const Promise = require('bluebird');
const pouchdb = require('pouchdb');
const bufferEqual = require('buffer-equal');

// Testing
const chai = require('chai');
const spies = require('chai-spies');
const chaiAsPromised = require("chai-as-promised");

// ----------------------------------- Setup -----------------------------------------
const expect = chai.expect;
const should = chai.should;
chai.use(spies);
chai.use(chaiAsPromised);

const provider = new Web3.providers.HttpProvider('http://localhost:8545');
const web3 = new Web3(provider);

// ----------------------------------- Tests -----------------------------------------
describe('BLE Utilites', () => {
    
    var keystore, address, hexAddress, deployed, goodTx, badTx, mismatchTx;
    var client = web3.eth.accounts[0];

    before(() => {

        // Prep an eth-lightwallet keystore/account for pin signing tests
        let json = JSON.stringify(account.keystore);
        keystore = wallet.keystore.deserialize(json);  
        keystore.generateNewAddress(account.key, 1);
        address = keystore.getAddresses()[0];    // Lightwallets addresses are not prefixed.
        hexAddress = '0x' + address;             // Eth's are prefixed - we recover them as this.

        // Deploy TestContract, compose some signed transactions for rawTx submission.
        return transactions.generate().then( mock => {   

            deployed = mock.deployed;            // TestContract.sol deployed to test-rpc                            
            goodTx = mock.goodTx;                // raw: TestContract.set(2, {from: client})
            badTx = mock.badTx;                  // raw: goodTx but sent with 0 gas.
            mismatchTx = mock.mismatchTx;        // raw: goodTx signed with wrong key.
        });
    });


    describe('queueContract(tx)', ()=>{
        var tx, queue, old_config;
        
        it('should transform input into buffers of MAX_SIZE & queue them',()=>{
            
            // Testing 11 chars (including "" from JSON stringify) /4 byte packets: 
            tx = "123412341";
            old_config = config.MAX_SEND;
            config.MAX_SEND = 4;
            
            util.queueContract(tx);
            queue = util._units.getSendQueue();
            
            expect(queue.length).to.equal(3);
            expect(Buffer.isBuffer(queue[0])).to.be.true;
            expect(queue[2].length).to.equal(3);

            // Testing 3 chars (including "" from JSON stringify) /4 byte packets:
            tx = '1';
            util._units.resetSendQueue();
            util.queueContract(tx);
            queue = util._units.getSendQueue();

            expect(queue.length).to.equal(1);
            expect(queue[0].length).to.equal(3);

            // Cleanup 
            config.MAX_SEND = old_config;

        });
    });

    describe('resetPin', ()=>{
        var new_pin, old_pin;

        it('should generate & set a new 32 character pin', ()=>{
    
            old_pin = util.getPin();

            util.resetPin();
            new_pin = util.getPin();

            expect( typeof old_pin).to.equal('string');
            expect( old_pin.length).to.equal(32);
            expect( typeof new_pin).to.equal('string');
            expect( new_pin.length).to.equal(32);
            expect(new_pin).not.to.equal(old_pin);
        });

    });

    describe('parseCall', () => {

        let data, output, expected, item1, item2;

        it('should return ok and an object with "to" and "data" fields if input valid', ()=>{
            
            // Everything ok.
            item1 = '0x253...eee';
            item2 = '0xf087407379e66de3...000';
            expected = {ok: true, val: {to: item1, data: item2}};
            data = JSON.stringify([item1, item2]);
            output = util.parseCall(data);
            expect(output).to.deep.equal(expected);
        });

        it('should return w/ error code if input is not JSON parseable', ()=> {
            
            // Data not JSON stringified.
            item1 = '0x253...eee';
            item2 = '0xf087407379e66de3...000';
            data = [item1, item2];
            expected = {ok: false, val: config.codes.INVALID_CALL_DATA};
            output = util.parseCall(data);
            expect(output).to.deep.equal(expected);
        });

        it('should return w/ error code if input is not array of length 2, hex strings', ()=>{

            // Data not hex
            item1 = '253...eee';
            item2 = 'f087407379e66de3...000';
            data = JSON.stringify([item1,item2]);
            expected = {ok: false, val: config.codes.INVALID_CALL_DATA};
            output = util.parseCall(data);
            expect(output).to.deep.equal(expected);
        });
    });

    describe('parseSignedPin(signed)', () =>{

        var req, output, msg;

        it('should return usable object representing a signed msg if input is form { v: r: s: }', () =>{

            msg = 'a message';
            req = wallet.signing.signMsg( keystore, account.key, msg, address); 
            req = JSON.stringify(req);
            
            output = util.parseSignedPin(req);

            expect( output.ok).to.be.true;
            expect( typeof output.val).to.equal('object');
            expect( Buffer.isBuffer(output.val.r)).to.be.true;
            expect( Buffer.isBuffer(output.val.s)).to.be.true;

        });

        it('should return usable string representing a signed msg if input is form "0x923 . . ."', ()=> {
            
            msg = util.getPin();
            let msgHash = ethjs_util.addHexPrefix(ethjs_util.sha3(msg).toString('hex'));
            let signed =  web3.eth.sign(client, msgHash); 
            let input = JSON.stringify(signed);

            output = util.parseSignedPin(input);
        
            expect(output.ok).to.be.true;
            expect(output.val).to.equal(signed);

        });

        it('should return error if input is object and not parse-able as a signed msg', ()=>{
            req = '{\"signed\": \"I am not signed\"}';
            output = util.parseSignedPin(req);

            expect(output.ok).to.equal(false);
            expect(output.val).to.equal(config.codes.NO_SIGNED_MSG_IN_REQUEST);
        });

        it('should return error if input is string and not hex-prefixed', ()=>{

            req = "dd5[w,r,0,,n,g";
            output = util.parseSignedPin(req);

            expect(output.ok).to.equal(false);
            expect(output.val).to.equal(config.codes.INVALID_JSON_IN_REQUEST);

        });
    });

    describe('parseSignedTx(data, client)', () => {

        let pin = 0, data, output;

        it('should extract and return a signed tx string from the data input', ()=> {
            data = JSON.stringify({ pin: pin, tx: goodTx });
            output = util.parseSignedTx(data, client );
            //expect(output.ok).to.be.true;
            expect(output.val).to.equal(goodTx);               
        });

        it('should error w/ INVALID_PIN if the client address is malformed', ()=>{
            // Good data, client address is error code
            data = JSON.stringify({ pin: pin, tx: goodTx });
            output = util.parseSignedTx(data, 0x02 );
            expect(output.ok).to.be.false;
            expect(output.val).to.equal(config.codes.INVALID_PIN);
        });

        it('should error w/ INVALID_JSON_IN_REQUEST if data is not parse-able as object', () => {
            data = JSON.stringify('not an object');
            output = util.parseSignedTx(data, client);
            expect(output.ok).to.be.false;
            expect(output.val).to.equal(config.codes.INVALID_JSON_IN_REQUEST);
        })

        it('should error w/ INVALID_JSON_IN_REQUEST if data obj does not have a "tx" key', () => {
            data = JSON.stringify({no_tx: 'hello!'});
            output = util.parseSignedTx(data, client);
            expect(output.ok).to.be.false;
            expect(output.val).to.equal(config.codes.INVALID_JSON_IN_REQUEST);
        });

        it('should error w/ INVALID_JSON_IN_REQUEST if data.tx is not a string', () => {
            data = JSON.stringify({tx: 12345});
            output = util.parseSignedTx(data, client);
            expect(output.ok).to.be.false;
            expect(output.val).to.equal(config.codes.INVALID_JSON_IN_REQUEST);
        });

        it('should error w/ INVALID_TX_SENDER_ADDRESS if tx sender is not client', ()=> {
            // Mock tx's are signed with accounts[0]
            data = JSON.stringify({pin: pin, tx: goodTx});
            output = util.parseSignedTx(data, web3.eth.accounts[2]);
            expect(output.ok).to.be.false;
            expect(output.val).to.equal(config.codes.INVALID_TX_SENDER_ADDRESS);
        });

        it('should error w/ INSUFFICIENT_GAS if tx gas limit too low', () => {
            data = JSON.stringify({pin: pin, tx: badTx});
            output = util.parseSignedTx(data, web3.eth.accounts[0]);
            expect(output.ok).to.be.false;
            expect(output.val).to.equal(config.codes.INSUFFICIENT_GAS);
        })

        //it('should error w/ INSUFFICIENT_BALANCE if tx sender cant afford gas', ()=> {
            // Mock tx's are signed with accounts[0]
        //    data = JSON.stringify({pin: pin, tx: brokeTx});
        //    output = util.parseSignedTx(data, web3.eth.accounts[4]);
        //    expect(output.ok).to.be.false;
        //    expect(output.val).to.equal(config.codes.INSUFFICIENT_BALANCE);
        //});

    });



    describe('parseTxHash(hash)', () => {

        let hash, input, output;
        it( 'should return an object containing a correctly formatted txHash', () => {
            hash = '0xf087407379e66de3d69da365826272f7750e6c978f5c2d034296de168f571e4d';
            input = JSON.stringify(hash);
            output = util.parseTxHash(input);
            expect(output.ok).to.be.true;
            expect(output.val).to.equal(hash);
        })

        it( 'should error w/ INVALID_TX_HASH if input is not a string', ()=>{
            hash = '{ hello: "I am not a string" }';
            input = JSON.stringify(hash);
            output = util.parseTxHash(input);
            expect(output.ok).to.be.false;
            expect(output.val).to.equal(config.codes.INVALID_TX_HASH);

        });

        it( 'should error w/ INVALID_TX_HASH if input is not hex prefixed', ()=> {
            hash = 'f087407379e66de3d69da365826272f7750e6c978f5c2d034296de168f571e4d';
            input = JSON.stringify(hash);
            output = util.parseTxHash(input);
            expect(output.ok).to.be.false;
            expect(output.val).to.equal(config.codes.INVALID_TX_HASH);
        });

        it( 'should error w/ INVALID_TX_HASH if input does not repr. 32bytes', () => {
            hash = '0xf087407379e66de3d69da365826272f7750e6c978f5c2d034296de168f';
            input = JSON.stringify(hash);
            output = util.parseTxHash(input);
            expect(output.ok).to.be.false;
            expect(output.val).to.equal(config.codes.INVALID_TX_HASH);
        });
    });

    describe('parseAddress', ()=>{

        let address, input, output, expected;
        it('should return ok with a valid account address', ()=>{

            address = "0x4dea71bde50f23d347d6b21e18c50f02221c50ad";
            input = JSON.stringify(address);
            expected = {ok: true, val: address};
            output = util.parseAddress(input);
            expect(output).to.deep.equal(expected);
        })

        it('should return err if account address malformed', ()=> {
            address = "4dea71bde50f23d347d6b21e18c50f02221c50ad";
            input = JSON.stringify(address);
            expected = {ok: false, val: config.codes.NO_TX_ADDR_ERR};
            output = util.parseAddress(input);
            expect(output).to.deep.equal(expected);
        })
    })

    describe('isValidSession(id)', function(){

        let db;
        
        // DB creation and cleanup
        beforeEach(() => { 
            db = new pouchdb('sessions'); 
            util._units.setDB(db);
        });

        afterEach(()=>{ return db.destroy() })


        it('should resolve if session id exists in the db', function(done){
            let doc = {_id: '55555', expires: '12345', account: "0x25345454564545"  };
            let tx = { account: "0x25345454564545" };
    
            db.put(doc).then(()=>{ 
                expect(util.isValidSession('55555', tx)).to.be.fulfilled.notify(done);        
            }).catch((err) => {
                expect('Test should not error').to.equal('true');
            });

        });

        it('should reject if the id param is not a string', function(done){
            expect(util.isValidSession({obj: 5})).to.be.rejected.notify(done);
        });

        it('should reject if the session record is not found in the DB', function(done){
            let doc = {_id: '55555', expires: '12345', account: "0x25345454564545"  };
            let tx = { account: "0x25345454564545" };

            db.put(doc).then(()=>{
                expect(util.isValidSession('77777', tx)).to.be.rejected.notify(done);        
            }).catch((err) => {
                expect('Test should not error').to.equal('true');
            });
        });

        it('should reject if the sessionId was not issued to the caller', function(done){
            let doc = {_id: '55555', expires: '12345', account: "0x25345454564545"  };
            let tx = { account: "0x00000000" };

            db.put(doc).then(()=>{
                expect(util.isValidSession('55555', tx)).to.be.rejected.notify(done);        
            }).catch((err) => {
                expect('Test should not error').to.equal('true');
            });
        });   
    });

    describe('startSession(tx)', function(){

       let db, orig_session;
        
        // DB creation and cleanup
        beforeEach(()=>{ 
            db = new pouchdb('sessions'); 
            util._units.setDB(db);
        });

        afterEach(()=>{ return db.destroy() });
        
        it('should bind a session id and expiration time to the param object', (done) => {

            let fakeTx = config.fakeTx;

            util.startSession(fakeTx).then(()=>{
                expect(fakeTx.sessionId).to.be.a.string;
                expect(fakeTx.expires).to.be.gt(Date.now());
                done();
            });
        });

        it('should save session data associated w/ caller account to the DB', function(done){

            let fakeTx = config.fakeTx;
            fakeTx.account = "0x25345454564545";

            util.startSession(fakeTx).then(()=>{
                let expected = {_id: fakeTx.sessionId, expires: fakeTx.expires, account: fakeTx.account }
                expect(db.get(fakeTx.sessionId)).to.eventually.include(expected).notify(done);
            });

        });

        it('should delete the session data after a specified time', function(done){
            let fakeTx = config.fakeTx;
            let original = config.SESSION_LENGTH;

            util._units.setSessionLength(10);
            util.startSession(fakeTx).then((doc)=>{
                
                setTimeout(()=>{
                    
                    expect(db.get(fakeTx.sessionId)).to.eventually.be.rejected.notify(done);
                    util._units.setSessionLength(original);
                    
                }, 15);
            });
        });
    });

    describe('parseSessionId', ()=>{

        let data, output, expected, good_id = '0123456789';

        it('should resolve the submitted sessionId string if ok', () => {
            data = { id: good_id, tx: '0x25345454564545....'  };
            data = JSON.stringify(data);
            expected = { ok: true, val: good_id }
            output = util.parseSessionId(data);
            expect(output).to.deep.equal(expected);
        });
        
        it('should reject w/ INVALID_SESSION_ID if data object incorrectly formatted', ()=>{
            data = '[dd50x0123';
            data = JSON.stringify(data);
            expected = {ok: false, val: config.codes.INVALID_SESSION_ID};
            output = util.parseSessionId(data);
            expect(output).to.deep.equal(expected);
        });

        it('should reject with error if id is not a string of correct length', ()=>{
            data = { id: '012345678', tx: '0x25345454564545....'  };
            data = JSON.stringify(data);
            expected = { ok: false, val: config.codes.INVALID_SESSION_ID }
            output = util.parseSessionId(data);
            expect(output).to.deep.equal(expected);
        });

    });

    describe('canSendTx(data)', ()=>{

        let db, eth_db, data, expected, orig_session, mock_auth_request;
        
        before( () => {
            eth_db = new pouchdb('contracts'); 
            db = db = new pouchdb('sessions'); 
            return db.destroy().then(() => { return eth_db.destroy() })
        })

        // DB creation and cleanup
        beforeEach(()=>{ 
            db = new pouchdb('sessions'); 
            eth_db = new pouchdb('contracts');
            eth.units.setDB(eth_db);
            util._units.setDB(db);
        });

        afterEach( () => {return db.destroy().then(() => { return eth_db.destroy() })} ) 
            

        it('should resolve signedTx if input is ok and client unknown', (done)=>{
            orig_session = {account: client};
            util.startSession(orig_session).then( doc => {
                data = JSON.stringify({id: doc.sessionId, tx: goodTx});
                expected = { ok: true, val: goodTx };
                expect(util.canSendTx(data)).to.eventually.deep.equal(expected).notify(done);
            })

        });

        it('should resolve signedTx if a completed authAndSend event exists for client', (done)=>{
            
            // Insert completed auth request for client into contractsDB
            mock_auth_request = { _id: client, authority: client, contractAddress: deployed.address, authStatus: 'success' };
            orig_session = {account: client};

            eth.db().put(mock_auth_request).then( res => { 
                util.startSession(orig_session).then( doc => {
                    data = JSON.stringify({id: doc.sessionId, tx: goodTx});
                    expected = { ok: true, val: goodTx};
                    util.canSendTx(data)
                        .then( res => {
                            expect(res).to.deep.equal(expected);
                            done();
                        })
                });
            })

        });

        it('should reject w/ TX_PENDING if a pending authAndSend requirement exists for client', (done)=>{
            
            // Insert pending auth request for client into contractsDB
            mock_auth_request = { _id: client, authority: client, contractAddress: deployed.address, authStatus: 'pending' };
            orig_session = {account: client};

            eth.db().put(mock_auth_request).then( res => { 
                util.startSession(orig_session).then( doc => {
                    data = JSON.stringify({id: doc.sessionId, tx: goodTx});
                    expected = { ok: false, val: config.codes.TX_PENDING };
                    util.canSendTx(data)
                        .then( res => expect(true).to.be.false)
                        .catch( err => {
                            expect(err).to.deep.equal(expected);
                            done();
                        })
                });
            })
            .catch( err => console.log(err));
        });

        it('should reject w/ INVALID_SESSION_ID if sessionId doesnt parse', (done)=>{
            
            // Session id not proper form, goodTx
            data = JSON.stringify({id: '001', tx: goodTx});
            
            expected = {ok: false, val: config.codes.INVALID_SESSION_ID}
            util.canSendTx(data)
                .then( res => expect(true).to.be.false )
                .catch( err => {
                    expect(err).to.deep.equal(expected);
                    done();
                })
        });

        it('should reject w/ SESSION_NOT_FOUND if sessionId missing', (done)=>{
            
            // Session id not in DB, goodTx
            data = JSON.stringify({id: '0123456789', tx: goodTx});
            
            expected = {ok: false, val: config.codes.SESSION_NOT_FOUND}
            util.canSendTx(data)
                .then( res => expect(true).to.be.false)
                .catch( err => {
                    expect(err).to.deep.equal(expected);
                    done();
                });
        });


        it('should reject w/error code if tx not signed by sessionId holder', (done)=>{
            
            // "goodTx" is signed by accounts[0], this session is signed by accounts[2]
            orig_session = {account: web3.eth.accounts[2]};
            
            util.startSession(orig_session).then( doc => {
                data = JSON.stringify({id: doc.sessionId, tx: goodTx});
                expected = { ok: false, val: config.codes.INVALID_TX_SENDER_ADDRESS };
                util.canSendTx(data)
                    .then( res => expect(true).to.be.false)
                    .catch(err => {
                        expect(err).to.deep.equal(expected);
                        done();
                    })
            });

        });
    });
});