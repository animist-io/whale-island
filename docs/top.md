# whale-island
[![Build Status](https://travis-ci.org/animist-io/whale-island.svg?branch=master)](https://travis-ci.org/animist-io/whale-island) **This project is in early development. Under construction.**

## Overview
Whale-island is a micro-computer based Ethereum client and Bluetooth beacon that connects to mobile devices via BLE server. Its API targets smart-contract logic about the physical location of contract participants but it also has Bluetooth endpoints to process transactions and provides general access to some web3 methods. Use cases for the services whale-island provides include:

+ Competitive races 
+ Any game where the co-location of players is a key component. 
+ Place or path contingent reward programs

An Ionic module that helps mobile Dapps interact with whale-island is under development at [animist-io/wowshuxkluh](https://github.com/animist-io/wowshuxkluh).

## Services available to mobile Dapps

+ A contract to request services from whale-island nodes exists on Ethereum at: `0xf802....69cd7` and its Solidity file can be found at [animist-io/wallowa/contracts](https://github.com/animist-io/wallowa/blob/master/contracts/AnimistEvent.sol). Nodes continuously listen for, store and respond to events fired on this contract. 

+ Whale-island locations and their Ethereum addresses can be found at `ipfs.io/ipfs/QmY...bdG`

#### Presence verification:

You can verify a contract participant's presence at a location by:

+ Making a presence verfication request through the deployed AnimistEvent contract at `0xf802....cde` **and**

+ Implementing a public method with the signature: `verifyPresence(address client, uint64 time)` in your contract. 

```javascript
import 'AnimistEvent.sol';

contract Visit {

    address public client;          // Client to verify presence of     
    address public node;            // Node client should visit (from IPFS)
    address public animistAddress;  // Deployed Animist contract for events.          
    bool public visited;            // Client state prior to proximity detection        
    uint64 public expires;          // Date (since Epoch) client must visit by  
    AnimistEvent public api;        // AnimistEvent contract instance.

    function Visit(){
        client = address(0x579f...eec);         
        node = address(0x2d0b...abc);            
        animistAddress = address(0xf802....cde); 
        visited = false;                        
        expires = 175232548098;                  

        // Instantiate AnimistEvent contract and request proximity detection
        api = AnimistEvent(animistAddress);    
        api.requestPresenceVerification(node, client, address(this));
    }

    // Implement method the node will execute on proximity detection
    function verifyPresence(address visitor, uint64 time) {
        if (msg.sender == node && visitor == client && time <= expires){
            visited = true;
        }
    }

    // Client could execute this method on whale-island over Bluetooth using the sendTx endpoint.
    function rewardVisit() {
        if( msg.sender == client && visited == true){
            // Reward client
        }
    }
}
```


#### Message Publication

You can publish a message over Bluetooth LE on an arbitrary characteristic from any whale-island node by: 

+ Generating a new v4 uuid with [node-uuid](https://www.npmjs.com/package/node-uuid) **and**

+ Making a message publication request through the deployed AnimistEvent contract at `0xf802....cde`.

```javascript
import 'AnimistEvent.sol';

contract Message {

    string public uuid;             // Arbitrary v4 characteristic uuid. 
    string public message;          // Message to publish at `uuid`
    uint32 public duration;         // Duration (ms) of broadcast
    address public node;            // Address of the broadcasting node (from IPFS)
    address public animistAddress;  // Address of deployed Animist contract for events.
    AnimistEvent public api;        // AnimistEvent contract instance

    function Message(){
        uuid = "A01D64E6-B...7-8338527B4E10";   
        message = "You are beautiful";             
        duration = 3000;                          
        node = address(0x579f...aec);               
        animistAddress = address(0xf802....cde); 

        // Instantiate AnimistEvent contract and request message publication  
        api = AnimistEvent(animistAddress);        
        api.requestMessagePublication(node, uuid, message, duration);    
    }
}
```

### Features

+ **Client Verification**: Nodes identify their clients by requiring them to sign a connection-specific pin published on a bluetooth channel each time they submit a transaction or request services bound to their identity. While this doesn't absolutely guarantee a client is proximate to the node, it may be adequate for many moderately valued, well-designed contracts. Spoofing the node typically requires establishing parrallel physical infrastructure that relays node transmissions and client responses in real time. Whale-island can also be combined with data sources like Google geo-location to make an oracle that's harder to corrupt. Dapps that rely on client based geo-location alone are vulnerable to highly programmatic spoofing if someone decompiles the app, engineers a way to feed arbitrary location to it and makes the resulting application available to a wider public. 

+ **Beacon:** Nodes emit two beacon signals: a persistent **identity beacon** that helps mobile devices locate them and a **requestable beacon** that allows contracts to emit a brief, unique signal to coordinate the behavior of multiple clients in the same place. iOS and Android apps that register with their OS to listen for the identity beacon will wake up from a backgrounded/killed state when those signals are encountered in the environment and are allowed to run pre-defined subroutines on their device's CPU for ~90 seconds. This means you can design long-running location-based mobile dapps that automatically connect to whale-island nodes and publish to the blockchain without requiring a user's explicit engagement. An example use-case for this behavior is a race where the user intentionally places a wager at the beginning and is automatically detected at the end, resolving the contest. Another would be a contract that rewards a client for visiting a location every day for a month without requiring that they check in somewhere. 

+ **Presence Receipts:** Whale-island also publishes data that can verify a client's presence without invoking contract methods. Using it's own account, the node signs a timestamp and a verified copy of the clients account address. The client can then present these to an adjudicating authority who extracts the public addresses from the packet and checks the results against node identification data published on IPFS. (See Bluetooth Server API below).

+ **Security:** Messages that can change a contract's state have to be encrypted. Every whale-island node has a PGP key that can be read from its pgpKeyID endpoint and used to query `https://pgp.mit.edu` for the public key. The public key is also available at the node's IPNS address which can be found by fetching the master list of nodes at `ipfs.io/ipfs/QmY...bdG`. [openpgpjs](https://github.com/openpgpjs/openpgpjs) is a good mobile-ready pgp library to manage client-side encryption with.     

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




