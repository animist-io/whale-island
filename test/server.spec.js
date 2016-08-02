'use strict'

// ----------------------------------- Imports -----------------------------------------

// Local
let config = require('../lib/config.js');
let server = require('../lib/server.js');
let eth = require('../lib/eth.js');

const account = require('../test/mocks/wallet.js');
const transactions = require('../test/mocks/transaction.js');

// Ethereum 
const Web3 = require('web3');
const util = require("ethereumjs-util");
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
describe('Bluetooth Server', () => {
    
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

    describe('Utilites', () => {

        var animist;

        beforeEach( () => { 
            animist = new server.AnimistServer();
        });

        describe('queueContract(tx)', ()=>{
            var tx, queue, old_config;
            
            it('should transform input into buffers of MAX_SIZE & queue them',()=>{
                
                // Testing 11 chars (including "" from JSON stringify) /4 byte packets: 
                tx = "123412341";
                old_config = config.MAX_SEND;
                config.MAX_SEND = 4;
                
                animist.queueContract(tx);
                queue = animist.getSendQueue();
                
                expect(queue.length).to.equal(3);
                expect(Buffer.isBuffer(queue[0])).to.be.true;
                expect(queue[2].length).to.equal(3);

                // Testing 3 chars (including "" from JSON stringify) /4 byte packets:
                tx = '1';
                animist.resetSendQueue();
                animist.queueContract(tx);
                queue = animist.getSendQueue();

                expect(queue.length).to.equal(1);
                expect(queue[0].length).to.equal(3);

                // Cleanup 
                config.MAX_SEND = old_config;

            });
        });

        describe('resetPin', ()=>{
            var new_pin, old_pin;

            it('should generate & set a new 32 character pin', ()=>{
        
                old_pin = animist.getPin();

                animist.resetPin();
                new_pin = animist.getPin();

                expect( typeof old_pin).to.equal('string');
                expect( old_pin.length).to.equal(32);
                expect( typeof new_pin).to.equal('string');
                expect( new_pin.length).to.equal(32);
                expect(new_pin).not.to.equal(old_pin);
            });

        });

        describe('parseSignedPin(signed)', () =>{

            var req, output, msg;

            it('should return usable object representing a signed msg if input is form { v: r: s: }', () =>{

                msg = 'a message';
                req = wallet.signing.signMsg( keystore, account.key, msg, address); 
                req = JSON.stringify(req);
                
                output = animist.parseSignedPin(req);

                expect( output.ok).to.be.true;
                expect( typeof output.val).to.equal('object');
                expect( Buffer.isBuffer(output.val.r)).to.be.true;
                expect( Buffer.isBuffer(output.val.s)).to.be.true;

            });

            it('should return usable string representing a signed msg if input is form "0x923 . . ."', ()=> {
                
                msg = animist.getPin();
                let msgHash = util.addHexPrefix(util.sha3(msg).toString('hex'));
                let signed =  web3.eth.sign(client, msgHash); 
                let input = JSON.stringify(signed);

                output = animist.parseSignedPin(input);
            
                expect(output.ok).to.be.true;
                expect(output.val).to.equal(signed);
    
            });

            it('should return error if input is object and not parse-able as a signed msg', ()=>{
                req = '{\"signed\": \"I am not signed\"}';
                output = animist.parseSignedPin(req);

                expect(output.ok).to.equal(false);
                expect(output.val).to.equal(config.codes.NO_SIGNED_MSG_IN_REQUEST);
            });

            it('should return error if input is string and not hex-prefixed', ()=>{

                req = "dd5[w,r,0,,n,g";
                output = animist.parseSignedPin(req);

                expect(output.ok).to.equal(false);
                expect(output.val).to.equal(config.codes.INVALID_JSON_IN_REQUEST);

            });
        });

        describe('parseSignedTx(data, client)', () => {

            let pin = 0, data, output;

            it('should extract and return a signed tx string from the data input', ()=> {
                data = JSON.stringify({ pin: pin, tx: goodTx });
                output = animist.parseSignedTx(data, client );
                //expect(output.ok).to.be.true;
                expect(output.val).to.equal(goodTx);               
            });

            it('should error w/ INVALID_PIN if the client address is malformed', ()=>{
                // Good data, client address is error code
                data = JSON.stringify({ pin: pin, tx: goodTx });
                output = animist.parseSignedTx(data, 0x02 );
                expect(output.ok).to.be.false;
                expect(output.val).to.equal(config.codes.INVALID_PIN);
            });

            it('should error w/ INVALID_JSON_IN_REQUEST if data is not parse-able as object', () => {
                data = JSON.stringify('not an object');
                output = animist.parseSignedTx(data, client);
                expect(output.ok).to.be.false;
                expect(output.val).to.equal(config.codes.INVALID_JSON_IN_REQUEST);
            })

            it('should error w/ INVALID_JSON_IN_REQUEST if data obj does not have a "tx" key', () => {
                data = JSON.stringify({no_tx: 'hello!'});
                output = animist.parseSignedTx(data, client);
                expect(output.ok).to.be.false;
                expect(output.val).to.equal(config.codes.INVALID_JSON_IN_REQUEST);
            });

            it('should error w/ INVALID_JSON_IN_REQUEST if data.tx is not a string', () => {
                data = JSON.stringify({tx: 12345});
                output = animist.parseSignedTx(data, client);
                expect(output.ok).to.be.false;
                expect(output.val).to.equal(config.codes.INVALID_JSON_IN_REQUEST);
            });

            it('should error w/ INVALID_TX_SENDER_ADDRESS if tx sender is not client', ()=> {
                // Mock tx's are signed with accounts[0]
                data = JSON.stringify({pin: pin, tx: goodTx});
                output = animist.parseSignedTx(data, web3.eth.accounts[2]);
                expect(output.ok).to.be.false;
                expect(output.val).to.equal(config.codes.INVALID_TX_SENDER_ADDRESS);
            });

            it('should error w/ INSUFFICIENT_GAS if tx gas limit too low', () => {
                data = JSON.stringify({pin: pin, tx: badTx});
                output = animist.parseSignedTx(data, web3.eth.accounts[0]);
                expect(output.ok).to.be.false;
                expect(output.val).to.equal(config.codes.INSUFFICIENT_GAS);
            })

            //it('should error w/ INSUFFICIENT_BALANCE if tx sender cant afford gas', ()=> {
                // Mock tx's are signed with accounts[0]
            //    data = JSON.stringify({pin: pin, tx: brokeTx});
            //    output = animist.parseSignedTx(data, web3.eth.accounts[4]);
            //    expect(output.ok).to.be.false;
            //    expect(output.val).to.equal(config.codes.INSUFFICIENT_BALANCE);
            //});

        });



        describe('parseTxHash(hash)', () => {

            let hash, input, output;
            it( 'should return an object containing a correctly formatted txHash', () => {
                hash = '0xf087407379e66de3d69da365826272f7750e6c978f5c2d034296de168f571e4d';
                input = JSON.stringify(hash);
                output = animist.parseTxHash(input);
                expect(output.ok).to.be.true;
                expect(output.val).to.equal(hash);
            })

            it( 'should error w/ INVALID_TX_HASH if input is not a string', ()=>{
                hash = '{ hello: "I am not a string" }';
                input = JSON.stringify(hash);
                output = animist.parseTxHash(input);
                expect(output.ok).to.be.false;
                expect(output.val).to.equal(config.codes.INVALID_TX_HASH);

            });

            it( 'should error w/ INVALID_TX_HASH if input is not hex prefixed', ()=> {
                hash = 'f087407379e66de3d69da365826272f7750e6c978f5c2d034296de168f571e4d';
                input = JSON.stringify(hash);
                output = animist.parseTxHash(input);
                expect(output.ok).to.be.false;
                expect(output.val).to.equal(config.codes.INVALID_TX_HASH);
            });

            it( 'should error w/ INVALID_TX_HASH if input does not repr. 32bytes', () => {
                hash = '0xf087407379e66de3d69da365826272f7750e6c978f5c2d034296de168f';
                input = JSON.stringify(hash);
                output = animist.parseTxHash(input);
                expect(output.ok).to.be.false;
                expect(output.val).to.equal(config.codes.INVALID_TX_HASH);
            });
        });

        describe('isValidSession(id)', function(){

            let db;
            
            // DB creation and cleanup
            beforeEach(() => { 
                db = new pouchdb('sessions'); 
                animist.setDB(db);
            });

            afterEach((done)=>{ 
                db.destroy().then(()=>{
                    done();
                }) 
            });

            it('should resolve if session id exists in the db', function(done){
                let doc = {_id: '55555', expires: '12345', account: "0x25345454564545"  };
                let tx = { account: "0x25345454564545" };
        
                db.put(doc).then(()=>{ 
                    expect(animist.isValidSession('55555', tx)).to.be.fulfilled.notify(done);        
                }).catch((err) => {
                    expect('Test should not error').to.equal('true');
                });

            });

            it('should reject if the id param is not a string', function(done){
                expect(animist.isValidSession({obj: 5})).to.be.rejected.notify(done);
            });

            it('should reject if the session record is not found in the DB', function(done){
                let doc = {_id: '55555', expires: '12345', account: "0x25345454564545"  };
                let tx = { account: "0x25345454564545" };

                db.put(doc).then(()=>{
                    expect(animist.isValidSession('77777', tx)).to.be.rejected.notify(done);        
                }).catch((err) => {
                    expect('Test should not error').to.equal('true');
                });
            });

            it('should reject if the sessionId was not issued to the caller', function(done){
                let doc = {_id: '55555', expires: '12345', account: "0x25345454564545"  };
                let tx = { account: "0x00000000" };

                db.put(doc).then(()=>{
                    expect(animist.isValidSession('55555', tx)).to.be.rejected.notify(done);        
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
                animist.setDB(db);
            });

            afterEach((done)=>{ 
                db.destroy().then(()=>{
                    done()
                }) 
            });
            
            it('should bind a session id and expiration time to the param object', (done) => {

                let fakeTx = config.fakeTx;

                animist.startSession(fakeTx).then(()=>{
                    expect(fakeTx.sessionId).to.be.a.string;
                    expect(fakeTx.expires).to.be.gt(Date.now());
                    done();
                });
            });

            it('should save session data associated w/ caller account to the DB', function(done){

                let fakeTx = config.fakeTx;
                fakeTx.account = "0x25345454564545";

                animist.startSession(fakeTx).then(()=>{
                    let expected = {_id: fakeTx.sessionId, expires: fakeTx.expires, account: fakeTx.account }
                    expect(db.get(fakeTx.sessionId)).to.eventually.include(expected).notify(done);
                });

            });

            it('should delete the session data after a specified time', function(done){
                let fakeTx = config.fakeTx;
                let original = config.SESSION_LENGTH;

                animist.setSessionLength(10);
                animist.startSession(fakeTx).then((doc)=>{
                    
                    setTimeout(()=>{
                        
                        expect(db.get(fakeTx.sessionId)).to.eventually.be.rejected.notify(done);
                        animist.setSessionLength(original);
                        
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
                output = animist.parseSessionId(data);
                expect(output).to.deep.equal(expected);
            });
            
            it('should reject w/ INVALID_SESSION_ID if data object incorrectly formatted', ()=>{
                data = '[dd50x0123';
                data = JSON.stringify(data);
                expected = {ok: false, val: config.codes.INVALID_SESSION_ID};
                output = animist.parseSessionId(data);
                expect(output).to.deep.equal(expected);
            });

            it('should reject with error if id is not a string of correct length', ()=>{
                data = { id: '012345678', tx: '0x25345454564545....'  };
                data = JSON.stringify(data);
                expected = { ok: false, val: config.codes.INVALID_SESSION_ID }
                output = animist.parseSessionId(data);
                expect(output).to.deep.equal(expected);
            });

        });

        describe('canSubmitTx(data)', ()=>{

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
                animist.setDB(db);
            });

            afterEach( () => {return db.destroy().then(() => { return eth_db.destroy() })} ) 
                

            it('should resolve signedTx if input is ok', (done)=>{
                orig_session = {account: client};
                animist.startSession(orig_session).then( doc => {
                    data = JSON.stringify({id: doc.sessionId, tx: goodTx});
                    expected = { ok: true, val: goodTx };
                    expect(animist.canSubmitTx(data)).to.eventually.deep.equal(expected).notify(done);
                })

            });

            it('should resolve signedTx if a completed authAndSubmit event exists for client', (done)=>{
                
                // Insert completed auth request for client into contractsDB
                mock_auth_request = { _id: client, authority: client, contractAddress: deployed.address, submittedTxHash: '0x0234...' };
                orig_session = {account: client};

                eth.db().put(mock_auth_request).then( res => { 
                    animist.startSession(orig_session).then( doc => {
                        data = JSON.stringify({id: doc.sessionId, tx: goodTx});
                        expected = { ok: true, val: goodTx};
                        animist.canSubmitTx(data)
                            .then( res => {
                                expect(res).to.deep.equal(expected);
                                done();
                            })
                    });
                })

            });

            it('should reject w/ TX_PENDING if an unsatisfied authAndSubmit requirement exists for client', (done)=>{
                
                // Insert pending auth request for client into contractsDB
                mock_auth_request = { _id: client, authority: client, contractAddress: deployed.address };
                orig_session = {account: client};

                eth.db().put(mock_auth_request).then( res => { 
                    animist.startSession(orig_session).then( doc => {
                        data = JSON.stringify({id: doc.sessionId, tx: goodTx});
                        expected = { ok: false, val: config.codes.TX_PENDING };
                        animist.canSubmitTx(data)
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
                animist.canSubmitTx(data)
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
                animist.canSubmitTx(data)
                    .then( res => expect(true).to.be.false)
                    .catch( err => {
                        expect(err).to.deep.equal(expected);
                        done();
                    });
            });


            it('should reject w/error code if tx not signed by sessionId holder', (done)=>{
                
                // "goodTx" is signed by accounts[0], this session is signed by accounts[2]
                orig_session = {account: web3.eth.accounts[2]};
                
                animist.startSession(orig_session).then( doc => {
                    data = JSON.stringify({id: doc.sessionId, tx: goodTx});
                    expected = { ok: false, val: config.codes.INVALID_TX_SENDER_ADDRESS };
                    animist.canSubmitTx(data)
                        .then( res => expect(true).to.be.false)
                        .catch(err => {
                            expect(err).to.deep.equal(expected);
                            done();
                        })
                });

            });
        });
    });

    describe('Request Handlers', () => {

        var animist, db; 
        

        // New server per test
        beforeEach(() => { 
            animist = new server.AnimistServer();
            db = new pouchdb('sessions'); 
            animist.setDB(db);
        });

        afterEach((done)=>{ 
            db.destroy().then(()=>{
                done()
            }) 
        });

        describe('onGetPin', () => {

          it('should respond w/ the current pin', () => {
            
            let fns = {};
            let codes = config.codes;
            let pin_to_buffer = new Buffer(animist.getPin());
            fns.callback = (code, pin) => {};
            
            chai.spy.on(fns, 'callback');
            animist.onGetPin(null, fns.callback);

            expect(fns.callback).to.have.been.called.with(codes.RESULT_SUCCESS, pin_to_buffer);

          });
        });

        describe('onGetTxStatus', () => {

            let hash, input, fns = {}, updateValueCallback, accounts = web3.eth.accounts;
            
            beforeEach(() => {
                fns.callback = () => {};
                hash = web3.eth.sendTransaction({from: accounts[0], to: accounts[1], value: 100 });
                input = JSON.stringify(hash);
                
            });

            it('should respond w/ RESULT_SUCCESS', (done) => {

                fns.callback = (code) => { 
                    expect(code).to.equal(config.codes.RESULT_SUCCESS);
                };

                updateValueCallback = val => { done() };
                animist.getTxStatusCharacteristic.updateValueCallback = updateValueCallback;
                animist.onGetTxStatus(input, null, null, fns.callback );

            });

            it( 'should send data about the queried tx', (done) => {
                
                let tx = web3.eth.getTransaction(hash);
                let res = {blockNumber: tx.blockNumber, nonce: tx.nonce, gas: tx.gas};
                let expected_send = new Buffer(JSON.stringify(res));

                updateValueCallback = (val) => {
                    expect(bufferEqual(val, expected_send)).to.be.true;
                    done();
                };
                animist.getTxStatusCharacteristic.updateValueCallback = updateValueCallback;
                animist.onGetTxStatus( input, null, null, fns.callback );
            });

            it('should respond with INVALID_TX_HASH if input is malformed', (done) => {
                let malformed = '0x000000000000000012345';
                let malformed_input = JSON.stringify(malformed);
                
                fns.callback = (code) => { 
                    expect(code).to.equal(config.codes.INVALID_TX_HASH);
                    done();
                };

                chai.spy.on(fns, 'callback');
                animist.onGetTxStatus(malformed_input, null, null, fns.callback );
            });

            it('should send "null" if unable to find tx', (done) => {
                let missing = '0xf087407379e66de3d69da365826272f7750e6c978f5c2d034296de168f500000';
                let missing_input = JSON.stringify(missing);
                let expected_send = new Buffer(JSON.stringify('null'));

                updateValueCallback = (val) => {
                    expect(bufferEqual(val, expected_send)).to.be.true;
                    done();
                };
                
                animist.getTxStatusCharacteristic.updateValueCallback = updateValueCallback;
                animist.onGetTxStatus(missing_input, null, null, fns.callback );
            });

        });

        describe('onGetNewSessionId', () => {

            let input, pin, signed, msgHash, fns = {}, updateValueCallback;
            
            beforeEach(() => {
                // Zero out previous write callback
                fns.callback = () => {};

                // Mock client signed pin (web3 style),
                pin = animist.getPin();
                msgHash = util.addHexPrefix(util.sha3(pin).toString('hex'));
                signed =  web3.eth.sign(client, msgHash); 
                input = JSON.stringify(signed);
                
            });

            it('should respond w/ RESULT_SUCCESS', (done) => {

                fns.callback = (code) => { 
                    expect(code).to.equal(config.codes.RESULT_SUCCESS);
                };

                updateValueCallback = val => { done() };
                animist.getNewSessionIdCharacteristic.updateValueCallback = updateValueCallback;
                animist.onGetNewSessionId(input, null, null, fns.callback );

            });

            it( 'should send sessionId data', (done) => {
                
                updateValueCallback = (val) => {
                    let out = JSON.parse(val.toString());
                    expect(out.sessionId).to.be.a('string');
                    expect(out.sessionId.length).to.equal(10);
                    expect(out.expires).to.be.a('number');
                    done();
                };
                animist.getNewSessionIdCharacteristic.updateValueCallback = updateValueCallback;
                animist.onGetNewSessionId(input, null, null, fns.callback );
            });

            it('should respond with NO_SIGNED_MSG_IN_REQUEST if input is malformed', (done) => {
                let malformed = "dd5[w,r,0,,n,g";
                let malformed_input = JSON.stringify(malformed);
                
                fns.callback = (code) => { 
                    expect(code).to.equal(config.codes.NO_SIGNED_MSG_IN_REQUEST);
                    done();
                };

                chai.spy.on(fns, 'callback');
                animist.onGetNewSessionId(malformed_input, null, null, fns.callback );
            });

        });



        describe('onAuthTx', function(){

            let pin, signed, msgHash, input, eth_db, record, updateValueCallback, fns = {};
            
            // Debugging . . . duplicate recs getting stuck in db
            before( () => {
                eth_db = new pouchdb('contracts'); 
                return eth_db.destroy();
            } )

             
            beforeEach( () => {

                // Zero out previous write callback
                fns.callback = () => {};

                // Mock client signed pin (web3 style),
                pin = animist.getPin();
                msgHash = util.addHexPrefix(util.sha3(pin).toString('hex'));
                signed =  web3.eth.sign(client, msgHash); 
                input = JSON.stringify(signed);

                // Load contract record into contractsDB.
                eth_db = new pouchdb('contracts'); 
                eth.units.setDB(eth_db);
                record = { _id: client, authority: client, contractAddress: deployed.address };
                return eth_db.put(record);

            });

            // Cleanup
            afterEach( () => { return eth_db.destroy() });

            it('should respond w/ RESULT_SUCCESS', (done) => {

                fns.callback = (code) => { 
                    expect(code).to.equal(config.codes.RESULT_SUCCESS);
                };

                updateValueCallback = val => { done() };
                animist.authTxCharacteristic.updateValueCallback = updateValueCallback;
                animist.onAuthTx(input, null, null, fns.callback );

            });

            it( 'should send the tx hash of the auth contract call', (done) => {
                
                fns.callback = () => {};

                // Check txHash form: Is buffer, right length, hex prefixed
                updateValueCallback = (val) => {
                    expect(Buffer.isBuffer(val)).to.be.true;
                    expect(val.length).to.equal(68)    
                    expect(util.isHexPrefixed(JSON.parse(val))).to.be.true;
                    done();
                };
                animist.authTxCharacteristic.updateValueCallback = updateValueCallback;
                animist.onAuthTx( input, null, null, fns.callback );
            });

            it('should respond with NO_SIGNED_MSG_IN_REQUEST if input is malformed', (done) => {
                let malformed = "dd5[w,r,0,,n,g";
                let malformed_input = JSON.stringify(malformed);
                
                fns.callback = (code) => { 
                    expect(code).to.equal(config.codes.NO_SIGNED_MSG_IN_REQUEST);
                    done();
                };

                chai.spy.on(fns, 'callback');
                animist.onAuthTx(malformed_input, null, null, fns.callback );
            });

            it('should send "null" if unable to find tx', (done) => {
                
                // Expecting 'null'
                let expected_send = new Buffer(JSON.stringify('null'));
                
                // Mock good pin sign, non-existent client.
                let non_client = web3.eth.accounts[3];
                pin = animist.getPin();
                msgHash = util.addHexPrefix(util.sha3(pin).toString('hex'));
                signed =  web3.eth.sign(non_client, msgHash); 
                input = JSON.stringify(signed);

                updateValueCallback = (val) => {
                    expect(bufferEqual(val, expected_send)).to.be.true;
                    done();
                };
                
                animist.authTxCharacteristic.updateValueCallback = updateValueCallback;
                animist.onAuthTx(input, null, null, fns.callback );
            });
        });

        describe('onAuthAndSubmitTx', ()=> {

            let data, record, output, pin, msgHash, signed, eth_db;

            beforeEach(()=>{

                // Mock client signed pin (web3 style),
                pin = animist.getPin();
                msgHash = util.addHexPrefix(util.sha3(pin).toString('hex'));
                signed =  web3.eth.sign(client, msgHash); 

                eth_db = new pouchdb('contracts'); 
                eth.units.setDB(eth_db);
                record = { _id: client, authority: client, contractAddress: deployed.address };
                return eth_db.put(record);
        
            });

            // Cleanup
            afterEach( () => { return eth_db.destroy() });

            it('should respond w/ RESULT_SUCCESS if pin and tx parse ok', (done)=>{
                data = JSON.stringify({pin: signed, tx: goodTx});
                
                let cb = (val) => {
                    expect(val).to.equal(config.codes.RESULT_SUCCESS);
                } 
                let updateValueCallback = (sent) => { done(); };
                animist.authAndSubmitTxCharacteristic.updateValueCallback = updateValueCallback;
                animist.onAuthAndSubmitTx(data, null, null, cb);
            });

            it('should send the tx hash of the verifyPresence method call', (done)=>{

                data = JSON.stringify({pin: signed, tx: goodTx});
                
                let cb = (val) => {};

                // Check txHash form: Is buffer, right length, hex prefixed
                let updateValueCallback = (val) => {
                    expect(Buffer.isBuffer(val)).to.be.true;
                    expect(val.length).to.equal(68)    
                    expect(util.isHexPrefixed(JSON.parse(val))).to.be.true;
                    done();
                };
                animist.authAndSubmitTxCharacteristic.updateValueCallback = updateValueCallback;    
                animist.onAuthAndSubmitTx(data, null, null, cb);
            });

            it('should call submitTxWhenAuthed', (done)=>{

                data = JSON.stringify({pin: signed, tx: goodTx});
                
                let cb = (val) => {};
                chai.spy.on(eth, 'submitTxWhenAuthed');

                let updateValueCallback = (sent) => {
                    expect(eth.submitTxWhenAuthed).to.have.been.called();
                    done();
                }
                animist.authAndSubmitTxCharacteristic.updateValueCallback = updateValueCallback;    
                animist.onAuthAndSubmitTx(data, null, null, cb);
            });
 
            it('should respond w/error if sent pin is bad', (done)=>{
                "dd5[w,r,0,,n,g"
                data = JSON.stringify({pin: "dd5[w,r,0,,n,g", tx: badTx});

                let cb = (val) => {
                    expect(val).to.equal(config.codes.NO_SIGNED_MSG_IN_REQUEST);
                    done();
                }    
                animist.onAuthAndSubmitTx(data, null, null, cb);
            });

            it('should respond w/error if sent tx is bad', (done)=> {

                data = JSON.stringify({pin: signed, tx: badTx});
                
                let cb = (val) => {
                    expect(val).to.equal(config.codes.INSUFFICIENT_GAS);
                    done();
                }    
                animist.onAuthAndSubmitTx(data, null, null, cb);
            });

        });

        describe('onSubmitTx', ()=>{

            let db, eth_db, cb, data, expected, orig_session, mock_auth_request;

            // Session DBs are opened and destroyed at the top of 'Request Handlers'
            // Debug - theres a contract left in the DB somewhere before this test
            before( () => {
                eth_db = new pouchdb('contracts'); 
                eth.units.setDB(eth_db);
                db = new pouchdb('sessions'); 
                return db.destroy().then(() => { return eth_db.destroy() })
            })
                
            it('should respond w/ RESULT_SUCCESS if sent data ok', (done)=>{
                orig_session = {account: client};
                cb = (val) => {
                    expect(val).to.equal(config.codes.RESULT_SUCCESS);
                }
                let updateValueCallback = (sent) => { done() };
                animist.submitTxCharacteristic.updateValueCallback = updateValueCallback;
                
                animist.startSession(orig_session).then( doc => {
                    data = JSON.stringify({id: doc.sessionId, tx: goodTx});
                    animist.onSubmitTx(data, null, null, cb);
                })
            });

            it('should send txHash of the submitted transaction', (done)=>{
                orig_session = {account: client};
                cb = (val) => {};

                // Check for hash form
                let updateValueCallback = (val) => {
                    expect(Buffer.isBuffer(val)).to.be.true;
                    expect(val.length).to.equal(68)    
                    expect(util.isHexPrefixed(JSON.parse(val))).to.be.true;
                    done();  
                };
                animist.submitTxCharacteristic.updateValueCallback = updateValueCallback;
                
                animist.startSession(orig_session).then( doc => {
                    data = JSON.stringify({id: doc.sessionId, tx: goodTx});
                    animist.onSubmitTx(data, null, null, cb);
                })
            });

            it('should respond with error code if caller cant submit a tx', (done)=>{
                orig_session = {account: web3.eth.accounts[2]};
                cb = (val) => {
                    expect(val).to.equal(config.codes.INVALID_TX_SENDER_ADDRESS);
                    done();
                }
                let updateValueCallback = (sent) => {};
                animist.submitTxCharacteristic.updateValueCallback = updateValueCallback;
                
                animist.startSession(orig_session).then( doc => {
                    data = JSON.stringify({id: doc.sessionId, tx: goodTx});
                    animist.onSubmitTx(data, null, null, cb);
                })
            })
        })

        describe('onGetSubmittedTxHash', () => {
            let pin, data, signed, msgHash, input, eth_db, mock_record, updateValueCallback, fns = {};
            
            // Debugging . . . duplicate recs getting stuck in db
            before( () => {
                eth_db = new pouchdb('contracts'); 
                return eth_db.destroy();
            } )

            beforeEach( () => {

                // Zero out previous write callback
                fns.callback = () => {};

                // Mock client signed pin (web3 style),
                pin = animist.getPin();
                msgHash = util.addHexPrefix(util.sha3(pin).toString('hex'));
                signed =  web3.eth.sign(client, msgHash); 
                input = JSON.stringify(signed);

                // Load contract record into contractsDB.
                eth_db = new pouchdb('contracts'); 
                eth.units.setDB(eth_db);

            });

            // Cleanup
            afterEach( () => { return eth_db.destroy() });

            it('should respond w/ RESULT_SUCCESS', (done) => {

                let cb = (code) => { 
                    expect(code).to.equal(config.codes.RESULT_SUCCESS);
                };

                updateValueCallback = val => { done() };
                animist.getSubmittedTxHashCharacteristic.updateValueCallback = updateValueCallback;
                animist.onGetSubmittedTxHash(input, null, null, cb );

            });

            it('should send authStatus, authTxHash & submittedTxHash data', (done)=>{
                mock_record = { 
                    _id: client, 
                    contractAddress: deployed.address,
                    authStatus: 'pending', 
                    authTxHash: '0x00001', 
                    submittedTxHash: null 
                };

                let cb = (code) => {};

                updateValueCallback = val => { 
                    expect(Buffer.isBuffer(val)).to.be.true;
                    val = JSON.parse(val);    
                    expect(val.authStatus).to.equal('pending');
                    expect(val.authTxHash).to.equal('0x00001');
                    expect(val.submittedTxHash).to.equal(null);
                    done();
                };

                animist.getSubmittedTxHashCharacteristic.updateValueCallback = updateValueCallback;
                eth_db.put(mock_record).then( res => animist.onGetSubmittedTxHash(input, null, null, cb));


            });

            it('should behave as expected: e2e', (done)=>{
                
                // Fast mine authAndSubmitTx
                let original_mining = config.MINING_CHECK_INTERVAL;
                eth.units.setMiningCheckInterval(10); // Fast!

                data = JSON.stringify({pin: signed, tx: goodTx});
                
                // Check getSubmittedTxHash val after +1 sec.
                let cb = (val) => {};
                let updateValueCallback = (val) => {
                    expect(Buffer.isBuffer(val)).to.be.true;
                    val = JSON.parse(val);    
                    expect(val.authStatus).to.equal('success');
                    expect(val.authTxHash.length).to.equal(66);
                    expect(val.submittedTxHash.length).to.equal(66);
                    eth.units.setMiningCheckInterval(original_mining);
                    done();
                };
            
                // Wait for simulated authAndSubmitTx call to (probably) finish
                setTimeout(()=>{
                    animist.onGetSubmittedTxHash(input, null, null, cb);
                }, 1000)

                // Simulate an authAndSubmitTx call.
                animist.getSubmittedTxHashCharacteristic.updateValueCallback = updateValueCallback;
                animist.authAndSubmitTxCharacteristic.updateValueCallback = () => {};    
                mock_record = { _id: client, authority: client, contractAddress: deployed.address };
                eth_db.put(mock_record).then( res => animist.onAuthAndSubmitTx(data, null, null, cb));  
            });

            it('should send "null" if it cant find the contract record', (done)=>{
                let expected_send = new Buffer(JSON.stringify('null'));

                mock_record = { 
                    _id: 'not_the_id_you_need', 
                    contractAddress: deployed.address,
                    authStatus: 'pending', 
                    authTxHash: '0x00001', 
                    submittedTxHash: null 
                };

                let cb = (code) => {};
                updateValueCallback = (val) => {
                    expect(bufferEqual(val, expected_send)).to.be.true;
                    done();
                };

                animist.getSubmittedTxHashCharacteristic.updateValueCallback = updateValueCallback;
                eth_db.put(mock_record).then( res => animist.onGetSubmittedTxHash(input, null, null, cb));
            });

            it('should respond w/ error code if pin signature doesnt parse', (done)=>{
    
                let data = JSON.stringify("dd5[w,r,0,,n,g");
                let cb = (val) => {
                    expect(val).to.equal(config.codes.NO_SIGNED_MSG_IN_REQUEST);
                    done();
                }    
                animist.onAuthAndSubmitTx(data, null, null, cb);
            });
        });

        describe('onGetBlockNumber', ()=> {

            let callback, valString, valInt;

            it('should respond w/RESULT_SUCCESS & the current blockNumber', (done) => {
                let callback = (code, val) => {
                    
                    // Decode val
                    valString = JSON.parse(val.toString());
                    valInt = parseInt(valString);
                    
                    expect(code).to.equal(config.codes.RESULT_SUCCESS);
                    expect(valInt).to.equal(web3.eth.blockNumber);
                    done();
                }

                animist.onGetBlockNumber(null, callback);
            });    
        });

        describe('onGetContractWrite', () => {
            
            let req, eth_db, mock_contract, fns = {};
    
            // Mocks
            before(()=>{
                
                // Mock request
                animist = new server.AnimistServer();
                req = wallet.signing.signMsg( keystore, account.key, animist.getPin(), address); 
                req = JSON.stringify(req);

                mock_contract = { _id: hexAddress, authority: hexAddress, contractAddress: deployed.address };
                
            });

            // Clear state, set a contract to find,  & mock updateValueCallback
            beforeEach((done)=>{

                eth_db = new pouchdb('contracts'); 
                eth.units.setDB(eth_db);

                animist.resetSendQueue();
                animist.getContractCharacteristic.updateValueCallback = (val) => {};
                fns.callback = (code) => {}; 

                eth_db.put(mock_contract).then(() => {
                    done();
                });
            });

            afterEach((done)=>{ 
                eth_db.destroy().then(() => { done() });
            }); 

            it('should respond w/ RESULT_SUCCESS if a tx matching the address is found', (done)=>{

                // Test state in success callback - make sure you run the timeout too
                // or it will f the subsequent tests
                fns.callback = (code) => { 
                    expect(code).to.equal(config.codes.RESULT_SUCCESS);
                    setTimeout(done, 55); 
                };
                animist.onGetContractWrite(req, null, null, fns.callback);
                
            });

            it('should push the tx into the send queue', (done) => {

                let initial_queue_size, new_queue_size;

                initial_queue_size = animist.getSendQueue().length;
                
                // Test state in success callback - make sure you run the timeout too
                // or it will f the subsequent tests
                fns.callback = (code) => { 
                    expect(code).to.equal(config.codes.RESULT_SUCCESS);
                    new_queue_size = animist.getSendQueue().length;
                    expect(initial_queue_size).to.equal(0);
                    expect(new_queue_size).to.be.gt(0);
                    setTimeout(done, 55); 
                };
            
                // Run fn
                animist.onGetContractWrite(req, null, null, fns.callback)
        
            });

            it('should begin writing/processing the send queue', (done) => {

                let tx, full_queue, full_queue_size, new_queue_size, expected_queue_size;
                
                // Clean up
                animist.resetSendQueue();
            
                // Test post callback . . . in a timeout.
                fns.callback = (code) => { 

                    full_queue = animist.getSendQueue();
                    full_queue_size = full_queue.length;
            
                    chai.spy.on(animist.getContractCharacteristic, 'updateValueCallback');

                    setTimeout(() => {
                        new_queue_size = animist.getSendQueue().length;
                        expect(code).to.equal(config.codes.RESULT_SUCCESS);
                        expect(animist.getContractCharacteristic.updateValueCallback).to.have.been.called();
                        expect(new_queue_size).to.equal(full_queue_size - 1);
                        done();
                    }, 55);
                };

                // Run
                animist.onGetContractWrite(req, null, null, fns.callback);
                
            });

            it('should respond w/ NO_TX_DB_ERR if there is no tx matching the address', (done)=>{
                
                // Setup: delete mock from contracts DB
                eth_db.get(hexAddress)
                    .then( doc => { return eth_db.remove(doc) })
                    .then( () => {
                        chai.spy.on(fns, 'callback');
                        setTimeout(() => {
                            expect(fns.callback).to.have.been.called.with(config.codes.NO_TX_DB_ERR);
                            done();
                        }, 55)
                        animist.onGetContractWrite(req, null, null, fns.callback);
                     })
            });

            it('should respond w/ error code if req is un-parseable', ()=>{

                req = "dd5[w,r,0,,n,g";
                chai.spy.on(fns, 'callback');

                animist.onGetContractWrite(req, null, null, fns.callback);
                expect(fns.callback).to.have.been.called.with(config.codes.INVALID_JSON_IN_REQUEST);
                
            });

        });

        describe('onGetContractIndicate', ()=>{
            var req, fns = {};


            // Run getContractWrite: Clear state & mock updateValueCallback
            beforeEach(() =>{

                animist.resetSendQueue();
                animist.getContractCharacteristic.updateValueCallback = (val) => {};
                animist.queueContract(config.fakeTx);

            });

            it('should de-queue & send the next packet', (done)=>{
                
                let queue = animist.getSendQueue();
                let initial_queue_size = queue.length;
                let initial_queue_element = queue[0];

                chai.spy.on(animist.getContractCharacteristic, 'updateValueCallback');
                animist.onGetContractIndicate();

                setTimeout(()=>{
                    queue = animist.getSendQueue();
                    expect(animist.getContractCharacteristic.updateValueCallback).to.have.been.called.with(initial_queue_element);
                    expect(queue.length).to.equal(initial_queue_size - 1);
                    done();
                },0);

            });

            it('should send EOF signal if queue is empty', (done)=>{

                let expected = new Buffer(config.codes.EOF);
                chai.spy.on(animist.getContractCharacteristic, 'updateValueCallback');

                animist.resetSendQueue();
                animist.onGetContractIndicate();

                setTimeout(()=>{
                    expect(animist.getContractCharacteristic.updateValueCallback).to.have.been.called.with(expected);
                    done();
                },10);

            });

            it('should do nothing post-EOF', (done)=>{

                // Run EOF
                animist.resetSendQueue();
                animist.onGetContractIndicate();

                setTimeout(()=>{
                    
                    // Post EOF
                    chai.spy.on(animist.getContractCharacteristic, 'updateValueCallback');
                    animist.onGetContractIndicate();

                    setTimeout(() =>{
                        expect(animist.getContractCharacteristic.updateValueCallback).not.to.have.been.called();
                        done();
                     },0)
                },0);
            });
        });
    });
});
