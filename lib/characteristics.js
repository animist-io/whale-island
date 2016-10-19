
const config = require('../lib/config');
const handlers = require('../lib/handlers');

// Bleno has to be mocked for Travis CI because bluetooth dependencies
// aren't whitelisted -> tests crash w/ a seg fault
//const bleno = require('bleno'); 
bleno = require('../test/mocks/bleno.js'); 

// ----------------  Characteristic Defs ---------------------------

const verifyPresenceCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.verifyPresence,
   properties: ['write'], 
   onWriteRequest: handlers.onVerifyPresence,
});

const verifyPresenceAndSendTxCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.verifyPresenceAndSendTx,
   properties: ['write'], 
   onWriteRequest: handlers.onVerifyPresenceAndSendTx,
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

const getPgpKeyIdCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.getPgpKeyId,
   properties: ['read'], 
   onReadRequest: handlers.onGetPgpKeyId
});

const getAccountBalanceCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.getAccountBalance,
   properties: ['write'], 
   onReadRequest: handlers.onGetAccountBalance
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

const getClientTxStatusCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.getClientTxStatus,
   properties: ['write'], 
   onWriteRequest: handlers.onGetClientTxStatus,
});

const getPresenceReceiptCharacteristic = new bleno.Characteristic({
   uuid: config.characteristicUUIDS.getPresenceReceipt,
   properties: ['write'], 
   onWriteRequest: handlers.onGetPresenceReceipt,
});

module.exports = {
    verifyPresenceCharacteristic: verifyPresenceCharacteristic,
    verifyPresenceAndSendTxCharacteristic: verifyPresenceCharacteristic,
    sendTxCharacteristic: sendTxCharacteristic,
    callTxCharacteristic: callTxCharacteristic,
    getPinCharacteristic: getPinCharacteristic,
    getDeviceAccountCharacteristic: getDeviceAccountCharacteristic,
    getBlockNumberCharacteristic: getBlockNumberCharacteristic,
    getAccountBalanceCharacteristic: getAccountBalanceCharacteristic,
    getTxStatusCharacteristic: getTxStatusCharacteristic,
    getNewSessionIdCharacteristic: getNewSessionIdCharacteristic,
    getContractCharacteristic: getContractCharacteristic,
    getClientTxStatusCharacteristic: getClientTxStatusCharacteristic,
    getPresenceReceiptCharacteristic: getPresenceReceiptCharacteristic

};