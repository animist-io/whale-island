'use strict'

let config = require('../lib/config.js');
const eth = require('../lib/eth.js')
const util = require('ethereumjs-util')
const account = require('../test/mocks/wallet.js');
const wallet = require('eth-lightwallet');
const pouchdb = require('pouchdb');

const chai = require('chai');
const spies = require('chai-spies');
const chaiAsPromised = require("chai-as-promised");
const expect = chai.expect;

chai.use(spies);
chai.use(chaiAsPromised);

describe('Eth Client', function(){

    var keystore, address, hexAddress;

    // Prep a single keystore/account for all eth-lightwallet tests
    before(() => {
        let json = JSON.stringify(account.keystore);
        keystore = wallet.keystore.deserialize(json);  
        keystore.generateNewAddress(account.key, 1);
        address = keystore.getAddresses()[0]; // Lightwallets addresses are not prefixed.
        hexAddress = util.addHexPrefix(address); // Eth's are - we recover them as this.
    });

    describe('Utilities', ()=> {

        describe('recover(rawMsg, signed)', ()=>{
            let db;

            it ('should extract and return string address from signed message', () =>{
                let msg, signed, result;

                msg = 'a message';
                signed = wallet.signing.signMsg( keystore, account.key, msg, address); 
                
                result = eth.recover(msg, signed);
                expect(result).to.equal(hexAddress);
            });

            it('should return undefined if ethereumjs-util throws an error', () => {
                let msg, result;

                msg = 'a message';
                result = eth.recover(msg, 'kfdlskdlf');
                expect(result).to.be.undefined;
            })
  
        });
    });

    describe('Request Handlers', () => {

        let db;

        // DB creation and cleanup
        beforeEach(() => { 
            db = new pouchdb('contracts'); 
            eth.units.setDB(db);
        });

        afterEach((done)=>{ 
            db.destroy().then(()=>{
                done();
            }) 
        });

        // -------------------------------- getContract ---------------------------------------------

        describe('getTx([pin, lastPin], signed)', ()=>{

            let pins, signed;

            before(()=>{
                pins = ['1234', '5678'];
                signed = wallet.signing.signMsg( keystore, account.key, pins[0], address); 
            })

            it('should resolve a contract if it finds one matching the acct. address', (done) =>{

                let mock = { _id: hexAddress, authority: hexAddress, contract: '12345'};
                db.put(mock).then(()=>{
                    expect(eth.getTx(pins, signed)).to.eventually.include(mock).notify(done);
                });
            });

            it('should append callers address to the contract', (done) => {
                let mock = { _id: hexAddress, authority: hexAddress, contract: '12345'};
                let expected = { caller: hexAddress };
                db.put(mock).then(()=>{
                    expect(eth.getTx(pins, signed)).to.eventually.include(expected).notify(done);
                });
            });


            it('should reject if it cant find a contract matching the acct. address', (done)=>{
                let mock = { _id: 'do_not_exist', authority: hexAddress, contract: '12345'};

                db.put(mock).then(()=>{
                    expect(eth.getTx(pins, signed)).to.eventually.be.rejected.notify(done);
                });
            });

            it('should reject if it is unable to extract an address from the signed msg', (done)=>{
                
                let garbage = 'garbage';
                expect(eth.getTx(pins, garbage)).to.eventually.be.rejected.notify(done);
            });

        });

        // ----------------------------------- authTx ---------------------------------------------

        contract('authTx([pin, lastPin], signed)', (accounts) =>{

            let pin, signed, msgHash, client = accounts[1]; 

            // Apparently contracts get processed first.
            before(()=>{
                pin = ['1234'];
                msgHash = util.addHexPrefix(util.sha3(pin[0]).toString('hex'));
                signed =  web3.eth.sign(client, msgHash);               
            });

            it('should call verifyPresence on relevant contract and resolve a valid tx hash', (done)=>{
                let tx;
                let block_before = web3.eth.blockNumber;
                let contractAddress = TestContract.deployed().address;
                let mock = { _id: client, authority: client, contract: contractAddress };
                
                Promise.all([
                    db.put(mock),
                    eth.authTx(pin, signed)
                ]).then( results => {
                    tx = web3.eth.getTransaction(results[1]);
                    expect(tx.hash).to.equal(results[1]);
                    expect(tx.blockNumber).to.equal(block_before + 1);
                    done();
                })
            });

            it('should reject if it cant find a contract matching the acct. address', (done)=>{
                let mock = { _id: 'do_not_exist', authority: hexAddress, contract: '12345'};

                db.put(mock).then(()=>{
                    expect(eth.getTx(pin, signed)).to.eventually.be.rejected.notify(done);
                });
            });

            it('should reject if it is unable to extract an address from the signed msg', (done)=>{
                
                let garbage = 'garbage';
                expect(eth.getTx(pin, garbage)).to.eventually.be.rejected.notify(done);
            });
        });


    });
});