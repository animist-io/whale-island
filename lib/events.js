/**
 * Filters for events triggered by an invocation of the node's event contract by 
 * client contracts. Currently two possible requests: Proximity detect client and
 * broadcast unique signal.  
 */

// Ethereum
const Web3 = require('web3');

// NPM
const pouchDB = require('pouchDB');
const upsert = require(pouchDB-upsert);

// Animist
const config = require('../lib/config.js');

// ----------------------------- Web3 Testing (test-rpc) ----------------------------------
let testRpc = new Web3.providers.HttpProvider("http://localhost:8545");
const web3 = new Web3(testRpc);
const deviceAccount = web3.eth.accounts[0];

// ----------------------------- Web3 Development (morden) --------------------------------
// Stub
// ----------------------------- Web3 Production  -----------------------------------------
// Stub

// ----------------------------- Databases  -----------------------------------------------

pouchDB.plugin(upsert);

let proximityContracts = (!process.env.TRAVIS) 
                    ? new pouchdb('http://localhost:5984/proximityContracts') 
                    : new pouchdb('proximityContracts');

let broadcastContracts = (!process.env.TRAVIS) 
                    ? new pouchdb('http://localhost:5984/broadcastContracts') 
                    : new pouchdb('broadcastContracts');

// ----------------------------- Locals  --------------------------------------------------
let contract = web3.eth.contract(config.eventsABI);
let eventsContract = contract.at(config.eventsContractAddress);

// ------------------------------ Utilities -----------------------------------------------

// TO DO:
const isValidAccount = function(){};
const isValidContract = function(){};
const isValidChannel = function(){};
const isValidContent = function(){};
const broadcastEvent = function( event ){} 
const emitError = function() {};

const getLastSavedBlock = function(db){

    return db.get('lastBlock')
        .then( doc => doc.val )
        .catch( err => 0 )
}
 
const saveBlock = function(db, block){
    return db.upsert('lastBlock', doc => {
        doc.val = block;
        return doc; 
    });
}

const addProximityEvent = function( event ){

    return proximityContracts.upsert(event.account, doc => {
        doc.contractAddress = event.contractAddress;
        return doc 
    })
} 



// ------------------------------ Core ---------------------------------------------------
const startProximityContractFilter = function( onSuccess ){

    getLastSavedBlock( proximityContracts ).then( last => {

        eventsContract.LogRegistration(null, {fromBlock: last, toBlock: 'latest'}, (err, res) => {
            
            if (!err && isValidAccount(res.account) && isValidContract(res.contractAddress)){

                Promise.all( [ 
                    addProximityEvent(res),
                    saveBlock(proximityContracts, res.blockNumber )
                ])
                .then( onSuccess )
                .catch( emitError )

            } else emitError(res);
        }) 
    });
}

const startBroadcastContractFilter = function(){

    getLastSavedBlock( broadcastContracts ).then( last => {

        eventsContract.LogBroadcast(null, {fromBlock: last, toBlock: 'latest'}, (err, res) => {
            
            if (!err && isValidChannel(res.channel) && isValidContent(res.val)){

                Promise.all( [ 
                    broadcastEvent(res),
                    saveBlock(broadcastContracts, res.blockNumber )
                ])
                .then( onSuccess )
                .catch( emitError )

            } else emitError(res);
        }) 
    });
}


