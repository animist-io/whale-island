
const config = require('../lib/config');
const handlers = require('../lib/handlers');

// Bleno has to be mocked for Travis CI because bluetooth dependencies
// aren't whitelisted -> tests crash w/ a seg fault
const bleno = (!process.env.TRAVIS) ? require('bleno') : require('../test/mocks/bleno.js'); 

// ----------------  Characteristic Defs ---------------------------

const authTxCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.authTx,
   properties: ['write'], 
   onWriteRequest: handlers.onAuthTx,
});

const authAndSubmitTxCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.authAndSubmitTx,
   properties: ['write'], 
   onWriteRequest: handlers.onAuthAndSubmitTx,
});

const callTxCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.callTx,
   properties: ['write'], 
   onWriteRequest: handlers.onCallTx,
});

const submitTxCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.submitTx,
   properties: ['write'], 
   onWriteRequest: handlers.onSubmitTx,
});

const getPinCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.getPin,
   properties: ['read'], 
   onReadRequest: handlers.onGetPin
});

const getBlockNumberCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.getBlockNumber,
   properties: ['read'], 
   onReadRequest: handlers.onGetBlockNumber
});

const getTxStatusCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.getTxStatus,
   properties: ['write'], 
   onWriteRequest: handlers.onGetTxStatus,
});

const getNewSessionIdCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.getNewSessionId,
   properties: ['write'], 
   onWriteRequest: handlers.onGetNewSessionId,
});

const getContractCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.getContract,
   properties: ['write', 'indicate'], 
   onWriteRequest: handlers.onGetContractWrite,
   onIndicate: handlers.onGetContractIndicate
});

const getSubmittedTxHashCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.getSubmittedTxHash,
   properties: ['write'], 
   onWriteRequest: handlers.onGetSubmittedTxHash,
});

module.exports = {
    authTxCharacteristic: authTxCharacteristic,
    authAndSubmitTxCharacteristic: authAndSubmitTxCharacteristic,
    submitTxCharacteristic: submitTxCharacteristic,
    callTxCharacteristic: callTxCharacteristic,
    getPinCharacteristic: getPinCharacteristic,
    getBlockNumberCharacteristic: getBlockNumberCharacteristic,
    getTxStatusCharacteristic: getTxStatusCharacteristic,
    getNewSessionIdCharacteristic: getNewSessionIdCharacteristic,
    getContractCharacteristic: getContractCharacteristic,
    getSubmittedTxHashCharacteristic: getSubmittedTxHashCharacteristic

};