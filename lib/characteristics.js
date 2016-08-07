
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

const authAndSendTxCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.authAndSendTx,
   properties: ['write'], 
   onWriteRequest: handlers.onAuthAndSendTx,
});

const callTxCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.callTx,
   properties: ['write'], 
   onWriteRequest: handlers.onCallTx,
});

const sendTxCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.sendTx,
   properties: ['write'], 
   onWriteRequest: handlers.onsendTx,
});

const getPinCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.getPin,
   properties: ['read'], 
   onReadRequest: handlers.onGetPin
});

const getDeviceAccountCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.getDeviceAccount,
   properties: ['read'], 
   onReadRequest: handlers.onGetDeviceAccount
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

const getVerifiedTxHashCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.getVerifiedTxHash,
   properties: ['write'], 
   onWriteRequest: handlers.onGetVerifiedTxHash,
});

module.exports = {
    authTxCharacteristic: authTxCharacteristic,
    authAndSendTxCharacteristic: authAndSendTxCharacteristic,
    sendTxCharacteristic: sendTxCharacteristic,
    callTxCharacteristic: callTxCharacteristic,
    getPinCharacteristic: getPinCharacteristic,
    getBlockNumberCharacteristic: getBlockNumberCharacteristic,
    getTxStatusCharacteristic: getTxStatusCharacteristic,
    getNewSessionIdCharacteristic: getNewSessionIdCharacteristic,
    getContractCharacteristic: getContractCharacteristic,
    getVerifiedTxHashCharacteristic: getVerifiedTxHashCharacteristic

};