# whale-island
[![Build Status](https://travis-ci.org/animist-io/whale-island.svg?branch=master)](https://travis-ci.org/animist-io/whale-island) **This project is in early development. Under construction.**

## Overview
Whale-island is a micro-computer based Ethereum client and Bluetooth beacon that connects to mobile devices via BLE server. Its API targets contract contingencies about location but it can also be used as a simple bluetooth-Ethereum interface to process transactions, deploy contracts and call their methods. An Ionic module that helps hybrid mobile apps interact with whale-island is under development at [animist-io/wowshuxkluh](https://github.com/animist-io/wowshuxkluh).

### Contract driven proximity detection and signal broadcasting 

+ The Animist events contract exists on Ethereum at: `0xf802....69cd7`.

+ The events contract Solidity file can be found at [animist-io/wallowa](https://github.com/animist-io/wallowa/blob/master/contracts/AnimistEvent.sol).

+ Whale-island locations and their Ethereum addresses can be found at `ipfs.io/ipfs/QmY...bdG`

**Proximity detection example:**

You can verify a contract participant's presence at a location by requesting proximity detection services from the AnimistEvent contract and implementing the public method `verifyPresence(address client, uint64 time)` in your contract. 

```javascript
import AnimistEvent.sol

contract Visit {
    
    address client = "0xab3....90b";             // Client to proximity detect
    address node = "0x757...abc";                // Eth address of the node they should visit (from IPFS)
    bool visited = false;                        // Client state prior to proximity detection
    uint64 expires = "17483...002";              // Date (unix) client must visit by
    address animistAddress = "0xf802 ...69cd7";  // Address of deployed Animist contract for events. 

    // Request proximity detection
    AnimistEvent api = AnimistEvent(animistAddress);
    api.requestProximityDetection(node, client, address(this));

    // Implement method the node will execute on proximity detection
    function verifyPresence(address visitor, uint64 time) public {
        if (msg.sender == node && visitor == client && time <= expires)
            visited = true;
    }
}
```


**Broadcast message example:**

You can also broadcast a message over Bluetooth LE on an arbitrary characteristic [uuid](https://www.npmjs.com/package/node-uuid) from any node. This is useful if you want to co-ordinate or direct the behavior of mobile clients. 

```javascript
import AnimistEvent.sol

contract Message {
    
    string channel = "A01D64E6-B...7-8338527B4E10";  // Arbitrary v4 characteristic uuid. 
    string message = "I love you";                   // Message to broadcast
    uint32 duration = "3000";                        // Duration (ms) of broadcast 
    address node = "0x757...abc";                    // Eth address of the broadcasting node (from IPFS)
    address animistAddress = "0xf802 ...69cd7";      // Address of deployed Animist contract for events. 

    // Request broadcast  
    AnimistEvent api = AnimistEvent(animistAddress);
    api.requestBroadcast(channel, message, duration);
}
```

### Other Features

+ **Client Verification**: Nodes identify their clients by asking them to sign a connection-specific pin published on a bluetooth channel. While this doesn't absolutely guarantee a client is proximate to the node, it may be adequate for many moderately valued, well-designed contracts. Spoofing the node typically requires establishing parrallel physical infrastructure that relays node transmissions and client responses in real time. Whale-island can also be combined with data sources like Google geo-location to make an oracle that's harder to corrupt. Dapps that rely on client based geo-location alone are vulnerable to highly programmatic spoofing if someone decompiles the app, engineers a way to feed arbitrary location to it and makes the resulting application available to a wider public. 

+ **Beacon:** iOS and Android apps that register with their OS to listen for beacon signal will wake up from a backgrounded/killed state when those signals are encountered in the environment and are allowed to run pre-defined subroutines on their device's CPU for ~90 seconds. This means you can design long-running location-based mobile dapps that automatically connect to whale-island nodes and publish to the blockchain without requiring a user's explicit engagement. An example use-case for this behavior is a race where the user intentionally places a wager at the beginning and is automatically detected at the end, resolving the contest. Another would be a contract that rewards a client for visiting a location every day for a month without requiring that they check in somewhere. 

+ **Presence Receipts:** Whale-island also publishes data that can verify a client's presence without invoking contract methods. Using it's own account, the node signs a timestamp and a verified copy of the clients account address. The client can then present these to an adjudicating authority who extracts the public addresses from the packet and checks the results against node identification data published on IPFS. (See Bluetooth Server API below).

+ **Security:** Endpoints that can change a contract's state have to be encrypted. Every whale-island node has a PGP key that can be read from its pgpKeyID endpoint and used to query `https://pgp.mit.edu` for the public key. [openpgpjs](https://github.com/openpgpjs/openpgpjs) is a good mobile-ready library for encrypting messages this way.     

### Installation

[Parity installation for Pi3](https://github.com/diglos/pi-gen)

[IPFS installation for Pi](https://github.com/claudiobizzotto/ipfs-rpi)

Raspbian Bleno
``` 
$ sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev 
```

CouchDB (Debian). For OSx download the .dmg directly from Apache
```
$ sudo apt-get install couchdb
$ npm install -g add-cors-to-couchdb
$ add-cors-to-couchdb
```

### Tests 

(set env var TRAVIS to true simulate Travis CI execution)
```
$ mocha --timeout 5s 

$ export TRAVIS=true
$ mocha --timeout 5s 
$ unset TRAVIS
```

### Run 
```
% node lib/server.js start
```

### Generate Docs
```
% gulp documentation
```

### Device UUIDs

Every animist node broadcasts a platform specific beacon uuid and provides access to server API endpoints and contract-triggered broadcast events at corresponding BLE service uuids. 

|   Service   | UUID         | Description    |
| ----------- | ------------ | -------------- |
| Beacon      | 4F7C5946-87BB-4C50-8051-D503CEBA2F19 | Read       |
| Server      | 05DEE885-E723-438F-B733-409E4DBFA694 | Read/Write |
| Broadcast   | CF5873BB-8F1F-416B-9073-7145864BD97D | Read       |
 

### Hex Response Codes

Server API Endpoints respond immediately with a hex code indicating whether or not the request is valid. For subscription requests, data (if available) follows after a min. 50ms delay. 

| Name | Value | -                | Name | Value |
|------|-------|------------------|------|-------|
|INVALID_JSON_IN_REQUEST|0x02|-   |INVALID_SESSION_ID|0x0E|
|INVALID_TX_HASH|0x07|-           |INVALID_CALL_DATA|0x11|
|INVALID_PIN|0x09|-               |SESSION_NOT_FOUND|0x10|
|INVALID_TX_SENDER_ADDRESS|0x0A|- |TX_PENDING|0x0F|
|INVALID_TX_SIGNATURE|0x0B|-      |NO_SIGNED_MSG_IN_REQUEST|0x03| 
|INSUFFICIENT_GAS|0x0C|-          |NO_TX_DB_ERR|0x04|
|INSUFFICIENT_BALANCE|0x0D|-      |NO_TX_ADDR_ERR|0x05|
|DECRYPTION_FAILED |0x12|-        |RESULT_SUCCESS|0x00|



### Other code documentation

[Web3 interface methods](https://github.com/animist-io/whale-island/blob/master/docs/eth.md)

[Utility methods (request parsers, etc)](https://github.com/animist-io/whale-island/blob/master/docs/util.md)

[Event Detection Methods](https://github.com/animist-io/whale-island/blob/master/docs/events.md)




