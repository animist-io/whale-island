"use strict"

let config = require('../lib/config.js');
const bleno = require('../test/mocks/bleno.js');

describe('Requestable Beacon', ()=>{

    describe('Event Handlers', ()=>{
        describe('onStateChange', ()=>{
            it('should set the poweredOn flag to true if bleno state is "poweredOn"');
            it('should set the poweredOn flag to false if bleno state is NOT "poweredOn"');
        });

        describe('onAdvertisingStart', ()=>{
            it('should set a timeout to stop advertising current beacon after spec config interval');
            it('should NOT set a timeout if there was an error');
            it('should initiate the next queued beacon trans. if there was an error');
        });

        describe('onAdvertisingStop', ()=>{
            it('should initiate the next queued beacon transmisssion');
        })
    })

    describe('Core', ()=>{
        describe('addBeacon', ()=>{
            it('should add a the beacon to the beacon queue');
            it('should begin transmitting the beacon if its the only one in the queue');
            it('should do nothing if bleno state is not "poweredOn"');
        });

        describe('startAdvertisingNextBeacon', ()=>{
            it('should dequeue a beacon and begin transmitting it');
            it('should do nothing if the queue is empty');
        });
    });

    describe('E2E', ()=>{
        it('should work for an empty queue');
        it('should for a queue with multiple items');
        it('should not lock up if there is an error broadcasting one of the beacons');
    });
});