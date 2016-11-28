'use strict'

// Ethereum 
const Web3 = require('web3');
const wallet = require('eth-lightwallet');
const util = require("ethereumjs-util");
const Transaction = require('ethereumjs-tx');
const contracts = require('../../contracts/Test.js');

// Setup
const provider = new Web3.providers.HttpProvider('http://localhost:8545');
const web3 = new Web3(provider);
const newContract = require('eth-new-contract').default(provider);

// These are private keys for test accounts produced by rpc.sh
const keys = [
    '0xe6d66f02cd45a13982b99a5abf3deab1f67cf7be9fee62f0a072cb70896342e4',
    '0x8bbd8f3de0823d414379b844075410ddc38b4853499ae571b5cc9cb4f8bb17a2',
    '0x1f0a3aa753ca2153da3bb80601f481ea2678f2e516837f9dce3496bec1f626c8',
    '0x9ae401b0dcd5e7e3f01d5d03f5a31dbd7fb99605246106cb28bb28d35adc9426',
    '0xd898476d9ec4a989617d15f9c6fccafd3115548e8c937e52309728d8f138ddb0'
];

const client = web3.eth.accounts[0];
const caller = web3.eth.accounts[1];

// Prints AnimistEvents contract ABI
const eventsABI = module.exports.eventsABI = function(){
    newContract( contracts.AnimistEvent, { from: client, gas: 3141592 }).then( deployed => {
        console.log('Events ABI:');
        console.log(JSON.stringify(deployed.abi));
    });
};

// Prints AnimistMethods contract ABI
const methodsABI = module.exports.methodsABI = function(){
    newContract( contracts.AnimistMethods, { from: client, gas: 3141592  }).then( deployed => {
        console.log('Methods ABI:');
        console.log(JSON.stringify(deployed.abi));
    });
};

// Deploys test contract. Generates and signs various success / fail transaction cases.
const generate = module.exports.generate = function(){
  
    return newContract( contracts.Test, { from: client, gas: 3141592  }).then( deployed => {
        
        let code = web3.eth.getCode(deployed.address); 
        let abi = deployed.abi;
        let privKey = util.stripHexPrefix(keys[0]);
        let privKeyNonClient = util.stripHexPrefix(keys[3]);
        let brokeKey = util.stripHexPrefix(keys[0]);
        
        let goodTxOptions = { gasPrice: 1, gasLimit: 3000000, data: util.stripHexPrefix(code)};
        let badTxOptions = { gasPrice: 1, gasLimit: 0, data: util.stripHexPrefix(code)};
        let callTxOptions = { data: util.stripHexPrefix(code)};
        
        goodTxOptions.to = util.stripHexPrefix(deployed.address);
        badTxOptions.to = util.stripHexPrefix(deployed.address);
        callTxOptions.to = util.stripHexPrefix(deployed.address);

        let goodTxSet = wallet.txutils.functionTx(abi, 'setState', [2], goodTxOptions);
        let badTxSet = wallet.txutils.functionTx(abi, 'setState', [2], badTxOptions);
        let callTxSet = wallet.txutils.functionTx(abi, 'getVerified', [], callTxOptions);
        
        goodTxSet = util.stripHexPrefix(goodTxSet);
        badTxSet = util.stripHexPrefix(badTxSet);
        callTxSet = util.stripHexPrefix(callTxSet);
        
        let goodTx = new Transaction(new Buffer(goodTxSet, 'hex'));
        let goodTxNonClient = new Transaction(new Buffer(goodTxSet, 'hex'));
        let badTx = new Transaction(new Buffer(badTxSet, 'hex'));
        let brokeTx = new Transaction(new Buffer(goodTxSet, 'hex'));
        let callTx = new Transaction(new Buffer(callTxSet, 'hex'));

        goodTx.sign(new Buffer(privKey, 'hex'));
        goodTxNonClient.sign(new Buffer(privKeyNonClient, 'hex'));
        badTx.sign(new Buffer(privKey, 'hex')); 
        brokeTx.sign(new Buffer(brokeKey, 'hex'));
        //callTx.sign(new Buffer(privKey, 'hex'));
        callTx = callTx.toJSON();
        
        goodTx = goodTx.serialize().toString('hex');
        goodTxNonClient = goodTxNonClient.serialize().toString('hex');
        badTx = badTx.serialize().toString('hex');
        brokeTx = brokeTx.serialize().toString('hex');
        
        return { 
            deployed: deployed, 
            goodTx: goodTx, 
            goodTxNonClient: goodTxNonClient,
            badTx: badTx, 
            brokeTx: brokeTx, 
            abi: abi, 
            callGetVerified: [callTx[3],callTx[5]] 
        }
                
    });
};


