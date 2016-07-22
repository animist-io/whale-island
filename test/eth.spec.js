'use strict'

let config = require('../lib/config.js');
const eth = require('../lib/eth.js')

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

    var keystore, address;

    // Prep a single keystore/account for all tests
    before(() => {
        let json = JSON.stringify(account.keystore);
        keystore = wallet.keystore.deserialize(json);  
        keystore.generateNewAddress(account.key, 1);
        address = keystore.getAddresses()[0];
    });

    describe('Utilities', ()=> {

        describe('recover(rawMsg, signed)', ()=>{
            let db;

            it ('should extract and return string address from signed message', () =>{
                let msg, signed, result;

                msg = 'a message';
                signed = wallet.signing.signMsg( keystore, account.key, msg, address); 
                
                result = eth.recover(msg, signed);
                expect(result).to.equal(address);
            });

            it('should return undefined if there is an error', () => {
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

        describe('getTx([pin, lastPin], signed)', ()=>{

            let pins, signed;

            before(()=>{
                pins = ['1234', '5678'];
                signed = wallet.signing.signMsg( keystore, account.key, pins[0], address); 
            })

            it('should resolve a contract if it finds one matching the acct. address', (done) =>{

                let mock = { _id: address, authority: address, contract: '12345'};
                db.put(mock).then(()=>{
                    expect(eth.getTx(pins, signed)).to.eventually.include(mock).notify(done);
                });
            });

            it('should append callers address to the contract', (done) => {
                let mock = { _id: address, authority: address, contract: '12345'};
                let expected = { caller: address };
                db.put(mock).then(()=>{
                    expect(eth.getTx(pins, signed)).to.eventually.include(expected).notify(done);
                });
            });


            it('should reject if it cant find a contract matching the acct. address', (done)=>{
                let mock = { _id: 'do_not_exist', authority: address, contract: '12345'};

                db.put(mock).then(()=>{
                    expect(eth.getTx(pins, signed)).to.eventually.be.rejected.notify(done);
                });
            });

            it('should reject if it is unable to extract an address from the signed msg', (done)=>{
                
                let garbage = 'garbage';
                expect(eth.getTx(pins, garbage)).to.eventually.be.rejected.notify(done);
            });

        });

        describe('authTx([pin, lastPin], signed)', () =>{

            it('should call auth on the contract', ()=>{

            });

            it('should reject if it cant find the contract', ()=>{

            })

            it('should resolve the transaction hash', ()=>{

            });

        });
    });
});