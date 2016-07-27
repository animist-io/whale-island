'use strict'

// ----------------------------------- Imports -----------------------------------------

// Local
let config = require('../lib/config.js');
const eth = require('../lib/eth.js');
const contracts = require('../contracts/Test.js');
const account = require('../test/mocks/wallet.js');

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

    var keystore, address, hexAddress, deployed;
    
    before(() => {

        // Prep a single keystore/account for all eth-lightwallet tests
        let json = JSON.stringify(account.keystore);
        keystore = wallet.keystore.deserialize(json);  
        keystore.generateNewAddress(account.key, 1);
        address = keystore.getAddresses()[0];    // Lightwallets addresses are not prefixed.
        hexAddress = util.addHexPrefix(address); // Eth's are - we recover them as this.

        // Deploy TestContract
        return newContract( contracts.Test, { from: web3.eth.accounts[0] })
                .then( Test => deployed = Test )
    });

    // -----------------------------  Utilities ----------------------------------------
    describe('Utilities', ()=> {

        describe('recover(rawMsg, signed)', ()=>{
            let db;

            it ('should extract and return string address from signed message', () =>{
                let msg = 'message', signed, result;
        
                signed = wallet.signing.signMsg( keystore, account.key, msg, address);         
                eth.recover(msg, signed).should.equal(hexAddress);
        
            });

            it('should return undefined if "signed" is bad, ethereumjs-util throws an error', () => {
                let err = eth.recover('a message', 'kfdlskdlf')
                expect(err).to.be.undefined;
            })
  
        });
    });

    // -----------------------------  Request Handlers -----------------------------------
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
        describe('getContract([pin, lastPin], signed)', ()=>{

            let pins, signed;

            before(()=>{
                pins = ['1234', '5678'];
                signed = wallet.signing.signMsg( keystore, account.key, pins[0], address); 
            })


            it('should resolve a contract if it finds one matching the acct. address', (done) =>{
                let mock = { _id: hexAddress, authority: hexAddress, contract: '12345'};
                db.put(mock).then(()=>{
                    eth.getContract(pins, signed).should.eventually.include(mock).notify(done);
                });
            });

            it('should append callers address to the contract', (done) => {
                let mock = { _id: hexAddress, authority: hexAddress, contract: '12345'};
                let expected = { caller: hexAddress };
                db.put(mock).then(()=>{
                    eth.getContract(pins, signed).should.eventually.include(expected).notify(done);
                });
            });


            it('should reject if it cant find a contract matching the acct. address', (done)=>{
                let mock = { _id: 'do_not_exist', authority: hexAddress, contract: '12345'};
                db.put(mock).then(()=>{
                    eth.getContract(pins, signed).should.eventually.be.rejected.notify(done);
                });
            });

            it('should reject if it is unable to extract an address from the signed msg', ()=>{
                let garbage = 'garbage';
                return eth.getContract(pins, garbage).should.eventually.be.rejected;
            });
        });
        describe( 'authTx([pin, lastPin], signed)', () => {

            let pin, signed, msgHash, client = web3.eth.accounts[0];

            // Sign a pin using web3 signing methods.
            before(() => {
                
                pin = ['1234'];
                msgHash = util.addHexPrefix(util.sha3(pin[0]).toString('hex'));
                signed =  web3.eth.sign(client, msgHash);     
            });

             it('should call verifyPresence on relevant contract and resolve a valid tx hash', (done)=>{
                let tx;
                let block_before = web3.eth.blockNumber;
                let contractAddress = deployed.address;
                let mock = { _id: client, authority: client, contract: contractAddress };
                
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
                let mock = { _id: 'do_not_exist', authority: hexAddress, contract: '12345'};

                db.put(mock).then( () => { 
                    eth.authTx(pin, signed).should.eventually.be.rejected.notify(done);
                });
            });

            it('should reject if it is unable to extract an address from the signed msg', () => {
                let garbage = 'garbage';
                return eth.authTx(pin, garbage).should.eventually.be.rejected;
            });
        });

        // ----------------------------------- authAndSubmitTx ------------------------------------------
        // ----------------------------------- submitTx -------------------------------------------------
        // ----------------------------------- getTx ----------------------------------------------------
    }); 
    
});


   


