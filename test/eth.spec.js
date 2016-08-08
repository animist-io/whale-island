'use strict'

// ----------------------------------- Imports -----------------------------------------

// Local
let config = require('../lib/config.js');
const eth = require('../lib/eth.js');
const contracts = require('../contracts/Test.js');
const account = require('../test/mocks/wallet.js');
const transactions = require('../test/mocks/transaction.js');

// Ethereum
const util = require('ethereumjs-util');
const wallet = require('eth-lightwallet');
const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider('http://localhost:8545');
const web3 = new Web3(provider);
const newContract = require('eth-new-contract').default(provider);

// DB
const pouchdb = require('pouchdb');

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
describe('Eth Client', function(){

    var keystore, address, hexAddress, deployed, abi, goodTx, badTx, mismatchTx, callGetVerified;
    
    before(() => {

        // Prep a single keystore/account for all eth-lightwallet tests
        let json = JSON.stringify(account.keystore);
        keystore = wallet.keystore.deserialize(json);  
        keystore.generateNewAddress(account.key, 1);
        address = keystore.getAddresses()[0];    // Lightwallets addresses are not prefixed.
        hexAddress = util.addHexPrefix(address); // Eth's are - we recover them as this.

        // Deploy TestContract, compose some signed transactions for rawTx submission.
        return transactions.generate().then( mock => {   

            deployed = mock.deployed;                // TestContract.sol deployed to test-rpc                            
            goodTx = mock.goodTx;                    // raw: TestContract.set(2, {from: client})
            badTx = mock.badTx;                      // raw: goodTx but sent with 0 gas.
            mismatchTx = mock.mismatchTx;            // raw: goodTx signed with wrong key.
            callGetVerified = mock.callGetVerified;  // raw: call getState
            abi = mock.abi;
        });
    });

    // -----------------------------------------------------------------------------------
    // -----------------------------  Utilities ------------------------------------------
    // -----------------------------------------------------------------------------------
    // 
    describe('Utilities', ()=> {

        describe('recover(rawMsg, signed)', ()=>{
            let db;

            it ('should extract and return string address from signed message', () =>{
                let msg = 'message', signed, result;
                signed = wallet.signing.signMsg( keystore, account.key, msg, address);         
                eth.recover(msg, signed).should.equal(hexAddress);
                
            });

            it('should return undefined if address unrecoverable (ethjs-util throws error)', () => {
                let err = eth.recover('a message', 'kfdlskdlf')
                expect(err).to.be.undefined;
            })  
        });
    });

    // -----------------------------------------------------------------------------------
    // -----------------------------  Request Handlers -----------------------------------
    // -----------------------------------------------------------------------------------
    describe( 'Request Handlers', () => {

        let db;

        // DB creation and cleanup
        beforeEach( () => { 
            db = new pouchdb('contracts'); 
            eth.units.setDB(db);
        });

        afterEach( () => { return db.destroy() });


        // -------------------------------- getBlockNumber --------------------------------
        describe( 'getBlockNumber', ()=> {
            it('should return the current blockNumber', ()=> {
                let expected_block = web3.eth.blockNumber;
                eth.getBlockNumber().should.equal(expected_block);
            });
        });

        describe( 'getAccountBalance', ()=>{
            let account, expected, out;

            it('should return string repr. the current balance of the account in wei', ()=>{
                account = web3.eth.accounts[3];
                expected = web3.eth.getBalance(account).toString();
                out = eth.getAccountBalance(account);
                expect(out).to.equal(expected);
            })

            it('should return string repr. 0 wei from a non-existent account', ()=>{
                account = "0x4dea71bde50f23d347d6b21e18c50f02221c50ae";
                expected = "0";
                out = eth.getAccountBalance(account);
                expect(out).to.equal(expected);
            })
        })

        // -------------------------------- callTx -----------------------------------------
        describe( 'callTx', ()=>{

            it('should return the value string returned by the call', () =>{
                
                // Testing getVerified in contract Test from mocks.
                // (should return 'true')
                let data = { to: callGetVerified[0], data: callGetVerified[1] };
                let result = eth.callTx(data);
                expect(typeof result).to.equal('string');
                expect(util.isHexPrefixed(result)).to.be.true;
                expect(Boolean(result)).to.be.true;
            });

            it('should return "0x" if the eth.call fails', () => {
                // Corrupt 'data'
                let data = { to: callGetVerified[0], data: callGetVerified[0] };
                let result = eth.callTx(data);
                expect(result).to.equal('0x');
            })
        })

        // -------------------------------- getTx ------------------------------------------
        describe( 'getTx', ()=> {
            let txHash, accounts = web3.eth.accounts;
            
            it('should resolve tx data', ()=> {
                txHash = web3.eth.sendTransaction({from: accounts[0], to: accounts[1], value: 100 });
                return eth.getTx(txHash).then( tx => {
                    tx.blockNumber.should.be.a('number');
                    tx.nonce.should.be.a('number');
                    tx.gas.should.be.a('number');
                });
            });

            it('should reject w/ NO_TX_DB_ERR if tx not found', () => {
                txHash = '0x000000000000000012345';
                return eth.getTx(txHash).catch( err => err.should.equal(config.codes.NO_TX_DB_ERR));
            })
        });

        // -------------------------------- getContract ------------------------------------
        describe('getContract(pin, signed)', ()=>{

            let pin, signed;

            before(()=>{
                pin = '1234';
                signed = wallet.signing.signMsg( keystore, account.key, pin, address); 

            })

            it('should resolve a contract object matching the acct. address', (done) =>{
                let mock = { _id: hexAddress, authority: hexAddress, contractAddress: deployed.address };
                let expected = { 
                    account: hexAddress, 
                    authority: hexAddress, 
                    contractAddress: deployed.address, 
                    code: web3.eth.getCode(deployed.address) 
                }
                db.put(mock).then(()=>{
                    eth.getContract(pin, signed).should.eventually.include(expected).notify(done);
                });
            });

            it('should reject if it cant find a contract matching the acct. address', (done)=>{
                let mock = { _id: 'do_not_exist', authority: hexAddress, contract: '12345'};
                db.put(mock).then(()=>{
                    eth.getContract(pin, signed).should.eventually.be.rejected.notify(done);
                });
            });

            it('should reject if unable to extract an address from the signed msg', ()=>{
                let garbage = 'garbage';
                return eth.getContract(pin, garbage).should.eventually.be.rejected;
            });
        });

        describe( 'authTx(pin, signed)', () => {

            let pin, signed, msgHash, client = web3.eth.accounts[0];

            // Sign a pin using web3 signing methods.
            before(() => {
                
                pin = '1234';
                msgHash = util.addHexPrefix(util.sha3(pin).toString('hex'));
                signed =  web3.eth.sign(client, msgHash);     
            });

             it('should call found contracts verifyPresence method and resolve a valid tx hash', (done)=>{
                let tx;
                let block_before = web3.eth.blockNumber;
                let contractAddress = deployed.address;

                let mock = { _id: client, authority: client, contractAddress: contractAddress };
                
                db.put(mock).then(() => {
                    eth.authTx(pin, signed).then( result => {
                        tx = web3.eth.getTransaction(result); 
                        tx.hash.should.equal(result);
                        tx.blockNumber.should.equal(block_before + 1);
                        done();
                    })
                })
            });

            it('should reject if it cant find a contract matching the acct. address', (done)=>{
                let mock = { _id: 'do_not_exist', authority: hexAddress, contractAddress: '12345'};

                db.put(mock).then( () => { 
                    eth.authTx(pin, signed).should.eventually.be.rejected.notify(done);
                });
            });

            it('should reject if unable to extract an address from the signed msg', () => {
                let garbage = 'garbage';
                return eth.authTx(pin, garbage).should.eventually.be.rejected;
            });
        });

        // ----------------------------------- authAndSendTx ------------------------------------------
        describe( 'sendTxWhenAuthed(authTxHash, signedTx, address', ()=> {

            let pin, signed, msgHash, authTxHash, client = web3.eth.accounts[0];

            // Debugging . . . duplicate recs getting stuck in db
            before( () => {
                let eth_db = new pouchdb('contracts'); 
                return eth_db.destroy();
            })
            
            beforeEach(() => {
                
                // Sign a pin using web3 signing methods.
                pin = '1234';
                msgHash = util.addHexPrefix(util.sha3(pin).toString('hex'));
                signed =  web3.eth.sign(client, msgHash);   

                // Auth the tx, get authTxHash.
                let mock = { _id: client, authority: client, contractAddress: deployed.address };
                return db.put(mock).then( res => {
                    return eth.authTx(pin, signed).then( result => authTxHash = result );  
                });
            });

            it('should update the contract record to show pending auth', (done)=>{
                let original_cycles = config.MAX_CONFIRMATION_CYCLES;
                let original_mining = config.MINING_CHECK_INTERVAL;
                let mock_record = { _id: hexAddress, authority: hexAddress, contractAddress: deployed.address };
                eth.units.setConfCycles(0); // Don't even check conf.
                eth.units.setMiningCheckInterval(10); // Fast!

                // This should get called in the conf. cycles check block.
                let cb = () => {
                    db.get(client).then( doc => {
                        expect(doc.authStatus).to.equal('pending');
                        expect(doc.authTxHash).to.equal(authTxHash);
                        expect(doc.verifiedTxHash).to.equal(null);

                        // Clean-up
                        eth.units.setConfCycles(original_cycles); 
                        eth.units.setMiningCheckInterval(original_mining); 
                        done();
                    });
                };

                eth.sendTxWhenAuthed(authTxHash, goodTx, client, cb );
            });

            it('should send the tx when auth is mined, save txHash and update auth status', (done)=>{

                let original_mining = config.MINING_CHECK_INTERVAL;
                eth.units.setMiningCheckInterval(2000); // 

                // This should get called post db update on success.
                let cb = () => {
                    db.get(client).then( doc => {
                        expect(doc.authStatus).to.equal('success');
                        expect(doc.authTxHash).to.equal(authTxHash);

                        // Don't really know what this is, so check form.
                        expect(util.isHexPrefixed(doc.verifiedTxHash)).to.be.true;
                        expect(doc.verifiedTxHash.length).to.equal(0x42);
                        
                        // Clean up
                        eth.units.setMiningCheckInterval(original_mining); 
                        done();
                    })
                }

                eth.sendTxWhenAuthed(authTxHash, goodTx, client, cb );

            });

            it('should continue cycling while authTx is pending', (done)=> {
                
                let original_cycles = config.MAX_CONFIRMATION_CYCLES;
                let original_mining = config.MINING_CHECK_INTERVAL;
                eth.units.setConfCycles(2); // Cycle a couple times
                eth.units.setMiningCheckInterval(10); // Fast!

                // Mock pending auth tx by mocking web3 local to eth.js
                let local_web3 = eth.units.getWeb3();
                let original_getTx = local_web3.eth.getTransaction;
                local_web3.eth.getTransaction = (hash) => { return { blockNumber: null }};

                let cb = (waitCycles) => {
                    db.get(client).then( doc => {
                        expect(waitCycles).to.be.gt(0);
                        expect(doc.authStatus).to.equal('pending');
                        expect(doc.authTxHash).to.equal(authTxHash);
                        expect(doc.verifiedTxHash).to.equal(null);

                        //Clean-up
                        local_web3.eth.getTransaction = original_getTx;
                        eth.units.setConfCycles(original_cycles); 
                        eth.units.setMiningCheckInterval(original_mining); 
                        done();
                    });
                }

                eth.sendTxWhenAuthed(authTxHash, goodTx, client, cb );
            });

            it('should mark contract auth status as failed if the auth throws', (done)=>{
                
                let gasLimit = 4712388; // Default test-rpc limit

                // Speed up mine.
                let original_mining = config.MINING_CHECK_INTERVAL;
                eth.units.setMiningCheckInterval(1000); // 

                // Mock an authtx that used gasLimit gas.
                let local_web3 = eth.units.getWeb3();
                let original_getTx = local_web3.eth.getTransactionReceipt;
                local_web3.eth.getTransactionReceipt = (hash) => { return { gasUsed: gasLimit }};

                let cb = () => {
                    db.get(client).then( doc => {
                        expect(doc.authStatus).to.equal('failed');
                        expect(doc.authTxHash).to.equal(authTxHash);
                        expect(doc.verifiedTxHash).to.equal(null);

                        //Clean-up
                        local_web3.eth.getTransactionReceipt = original_getTx;
                        eth.units.setMiningCheckInterval(original_mining); 
                        done();
                    });
                }
                eth.sendTxWhenAuthed(authTxHash, goodTx, client, cb );
            });            
        });
    });  
});

 

