# whale-island
[![Build Status](https://travis-ci.org/animist-io/whale-island.svg?branch=master)](https://travis-ci.org/animist-io/whale-island) **This project is in early development. Under construction.**

## Overview
Whale-island is a micro-computer based Ethereum client and Bluetooth beacon that connects to mobile devices via BLE server. Its API targets smart-contract logic about the physical location of mobile Dapp users but it also has Bluetooth endpoints to process transactions and provides general access to some web3 methods. Use cases for whale-island's services include:

+ Competitive wagered races
+ Any game where the co-location of players is a key component. 
+ Path or place contingent reward programs.

Javascript libraries to help mobile Dapps interact with whale-island are in development at [animist-io/wowshuxkluh](https://github.com/animist-io/wowshuxkluh).

## Services

+ A contract to request services from whale-island nodes exists on Ethereum at: `0xf802....cde` and its Solidity file can be found at [animist-io/wallowa/contracts](https://github.com/animist-io/wallowa/blob/master/contracts/AnimistEvent.sol). Nodes continuously listen for, store and respond to events fired on this contract. 

+ Whale-island locations and their Ethereum addresses can be found at `ipfs.io/ipfs/QmY...bdG`

#### Presence verification:

You can verify a contract participant's presence at a location by:

+ Making a presence verfication request through the deployed AnimistEvent contract at `0xf802....cde` **and**

+ Implementing a public contract method for whale-island to invoke with the following function signature: 
  * `verifyPresence(address visitor, uint64 time)` 

**Example**
```javascript
import 'AnimistEvent.sol';

contract Visit {

    address public client;          // Mobile client to verify presence of     
    address public node;            // Node that client should visit (from IPFS)
    address public animistAddress;  // Deployed Animist contract for events.          
    bool public visited;            // Flag to be set when node detects visiting client        
    uint64 public expires;          // Date (since Epoch ms) client must visit by  
    AnimistEvent public api;        // AnimistEvent contract instance.

    function Visit(){
        client = address(0x579f...eec);         
        node = address(0x2d0b...abc);            
        animistAddress = address(0xf802....cde); 
        visited = false;                        
        expires = 175232548098;                  

        // Instantiate AnimistEvent contract and request presence verification
        api = AnimistEvent(animistAddress);    
        api.requestPresenceVerification(node, client, address(this));
    }

    // Method the node will execute when client calls its verifyPresence endpoint over BLE
    function verifyPresence(address visitor, uint64 time) {
        if (msg.sender == node && visitor == client && time <= expires){
            visited = true;
        }
    }

    // Method mobile client could compose locally using the ethereumjs-tx library and invoke by 
    // transmitting the serialized result to whale-island's sendTx endpoint.
    function rewardVisit() {
        if( msg.sender == client && visited == true){
            // Reward client
        }
    }
}
```

#### Beacon Broadcasting

You can broadcast an arbitrary beacon signal from any whale-island node and confirm that a mobile client received it by:

+ Generating a new v4 uuid with [node-uuid](https://www.npmjs.com/package/node-uuid) **and**

+ Making a beacon broadcast request through the deployed AnimistEvent contract at `0xf802....cde` **and**

+ Implementing a public contract method for whale-island to invoke with the following function signature: 
  * `submitSignedBeaconId( uint8 v, bytes32 r, bytes32 s)`

This is useful if you want to coordinate the behavior of several mobile clients in the same place by firing a brief signal (like a starting shot) that all clients will hear simultaneously. The node broadcasts the requested beacon uuid with randomly generated values for its 2 byte major / minor components. It then signs a string with form `<uuid>:<major>:<minor>` and submits it to the clients' contract via `submitSignedBeaconId `. You can verify that a client was present when the signal was fired by asking them to use their received beacon values to extract the node's address from the signed copy stored in the contract using Solidity's `ecrecover` method. 

**Example**
```javascript
import 'AnimistEvent.sol';

contract Beacon {

    struct SignedBeacon {    // Storage for elliptic curve signature of beacon broadcast by node.
        uint8 v;             // (See submitSignedBeaconId and receivedMatchesSigned methods below)
        bytes32 r;           
        bytes32 s; 
    }

    string public uuid;             // Arbitrary v4 beacon uuid. 
    address public node;            // Address of the broadcasting node (from IPFS)
    address public animistAddress;  // Address of deployed Animist contract for events.
    AnimistEvent public api;        // AnimistEvent contract instance
    SignedBeacon signedBeacon;      // '<uuid>:<major>:<minor>' signed by node.

    function Beacon(){
        uuid = "A01D64E6-B...7-8338527B4E10";                           
        node = address(0x579f...aec);               
        animistAddress = address(0xf802....cde); 

        // Instantiate AnimistEvent contract and request beacon broadcast 
        api = AnimistEvent(animistAddress);        
        api.requestBeaconBroadcast(node, uuid, address(this));    
    }

    // Method the node will execute on this contract when it begins 
    // broadcasting the beacon. Params v, r, s are the elliptic curve signature 
    // components of the string '<uuid>:<major>:<minor>', signed with the node's private key. 
    function submitSignedBeaconId( uint8 v, bytes32 r, bytes32 s) public {
        signedBeacon.v = v;
        signedBeacon.r = r;
        signedBeacon.s = s;
    }

    // Method client will invoke which verifies that the beacon signal they heard is 
    // identical to the one signed by the node. 
    // @param {String}  received  has form <uuid>:<major>:<minor>, encodes the transmitted beacon values. 
    // @param {Address} signingNode' address of the node the contract asked to fire the beacon. 
    function receivedMatchesSigned( string received, address signingNode ) constant returns (bool result){
            
        var receivedHash = sha3(received);
        var recovered = ecrecover(receivedHash, signedBeacon.v, signedBeacon.r, signedBeacon.s);

        if (recovered == signingNode)
            return true;
        else
            return false;
    }
}
```


#### Message Publication

You can publish a message to mobile clients on an arbitrary BLE characteristic at any whale-island node and have delivery confirmation printed to the contract when the client reads it by: 

+ Generating a new v4 uuid with [node-uuid](https://www.npmjs.com/package/node-uuid) **and**

+ Making a message publication request through the deployed AnimistEvent contract at `0xf802....cde` **and**

+ Implementing two public contract methods for whale-island to invoke with the following function signatures:
  * `isAuthorizedToReadMessage( address visitor, string uuid ) constant returns (bool result)`
  * `confirmMessageDelivery( address visitor, string uuid, uint64 time )`


**Example**
```javascript
import 'AnimistEvent.sol';

contract Message {

    string public uuid;             // Arbitrary v4 characteristic uuid. 
    string public message;          // Message to publish at `uuid`
    uint32 public expires;          // Date (since Epoch ms) broadcast ends.
    address public node;            // Address of the broadcasting node (from IPFS)
    address public animistAddress;  // Address of deployed Animist contract for events.
    address public authorizedClient // Address of mobile client authorized to read message.
    bool public messageDelivered    // Flag set when node confirms that client read message.
    AnimistEvent public api;        // AnimistEvent contract instance

    function Message(){
        uuid = "A01D64E6-B...7-8338527B4E10";   
        message = "You are beautiful";             
        expires = 15756..21;                          
        node = address(0x579f...aec);     
        authorizedClient = address(0x757e..eda);          
        animistAddress = address(0xf802....cde); 

        // Instantiate AnimistEvent contract and request message publication  
        api = AnimistEvent(animistAddress);        
        api.requestMessagePublication(node, uuid, message, expires, address(this));    
    }

    // Constant method node will invoke to verify that client who connected to it is permitted to 
    // read published message. (This is necessary to protect against spamming the contract ).
    function isAuthorizedToReadMessage( address visitor, string uuid ) constant returns (bool result){

        if (msg.sender == node && visitor == authorizedClient )
            return true;
        else
            return false;
    }

    // Method node will invoke when it allows client to read message from characteristic.
    function confirmMessageDelivery( address visitor, string uuid, uint64 time){
        if (msg.sender == node && visitor == authorizedClient )
            messageDelivered = true;
    } 

}
```

### Features

+ **Client Verification**: Nodes identify their clients by requiring that they sign a connection-specific pin published over BLE each time they submit a transaction. While this doesn't absolutely guarantee a client is proximate to the node, it may be adequate for many moderately valued, well-designed contracts. Spoofing the node requires establishing parrallel physical infrastructure that relays node transmissions and client responses in real time. Whale-island can also be combined with data sources like Google geo-location to make an oracle that's harder to corrupt. Dapps that rely on client based geo-location alone are vulnerable to highly [programmatic spoofing](https://devs-lab.com/pokemon-go-hacks-without-moving-anywhere.html) if someone decompiles the app, engineers a way to feed arbitrary location to it and makes the resulting application available to a wider public. 

+ **Beacon:** Nodes emit two beacon signals: a persistent **identity beacon** that helps mobile devices locate them and a **requestable beacon** that allows contracts to emit a brief, unique signal. iOS and Android apps that register with their OS to listen for the identity beacon will wake up from a backgrounded/killed state when those signals are encountered in the environment and are allowed to run pre-defined subroutines on their device's CPU for ~90 seconds. This means you can design long-running location-based mobile dapps that automatically connect to whale-island nodes and publish to the blockchain without requiring a user's explicit engagement. An example use-case for this behavior is a race where the user intentionally places a wager at the beginning and is automatically detected at the end, resolving the contest. Another would be a contract that rewards a client for visiting a location every day for a month without requiring that they check in somewhere. 

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

### Node Service UUIDs

Every animist node broadcasts a platform specific beacon uuid and provides access to server endpoints and contract-triggered broadcast events at corresponding BLE service uuids. 

|   Service   | UUID         | Description    |
| ----------- | ------------ | -------------- |
| Identity Beacon      | 4F7C5946-87BB-4C50-8051-D503CEBA2F19 | Read       |
| Requestable Beacon   | v4 uuid defined by client contract | Read       |
| Server               | 05DEE885-E723-438F-B733-409E4DBFA694 | Read/Write |


### Server Characteristic UUIDS

| Endpoint Name            | UUID |
| --------                 | ---- |
|  getPin                  | C40C94B3-D9FF-45A0-9A37-032D72E423A9 |
|  getDeviceAccount        | 1FD26CCA-EA2B-4B9E-A59E-17AA7E61A0AC |
|  getBlockNumber          | C888866C-3499-4B80-B145-E1A61620F885 |
|  getPgpKeyId             | 75C06966-FEF2-4B23-A5AE-60BA8A5C622C |
|  getAccountBalance       | A85B7044-F1C5-43AD-873A-CF923B6D62E7 |
|  getTxStatus             | 03796948-4475-4E6F-812E-18807B28A84A |
|  getClientTxStatus       | 421522D1-C7EE-494C-A1E4-029BBE644E8D |
|  getContract             | BFA15C55-ED8F-47B4-BD6A-31280E98C7BA |
|  getContractAddress      | 007A62CC-068F-4E85-898E-7EA98AD4E31B |
|  verifyPresence          | 297E3B0A-F353-4531-9D44-3686CC8C4036 |
|  verifyPresenceAndSendTx | 8D8577B9-E2F0-4750-BB82-421750D9BF86 |
|  getPresenceReceipt      | BA2C3091-DAB8-4D51-BF92-3A6F023E9AD7 |
|  sendTx                  | 3340BC2C-70AE-4E7A-BE24-8B2ED8E3ED06 | 
|  callTx                  | 4506C117-0A27-4D90-94A1-08BB81B0738F |



### Hex Response Codes

Server endpoints respond immediately with a hex code indicating whether or not the request is valid. For subscription requests, data (if available) follows after a min. 50ms delay. 

| Name | Value | -                | Name | Value |
|------|-------|------------------|------|-------|
|INVALID_JSON_IN_REQUEST|0x02|-   |NOT_AUTHORIZED|0x0E|
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




