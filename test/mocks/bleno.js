'use strict'

// Bleno mocks for Travis CI build
module.exports.Characteristic = class Characteristic{ constructor(obj){
    this.uuid = obj.uuid.replace(/-/g, '');
    this.properties = obj.properties;
    this.onReadRequest = obj.onReadRequest;
}};
module.exports.PrimaryService = class PrimaryService{ constructor(obj){} };
module.exports.startAdvertising = (val, array, fn) => {};
module.exports.stopAdvertising = () => {};
module.exports.startAdvertisingIBeacon = (uuid, major, minor, power, fn) => {};
module.exports.setServices = (array) => {};
module.exports.disconnect = () => {};
module.exports.on = (event, fn) => {};
