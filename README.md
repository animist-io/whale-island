# whale-island
[![Build Status](https://travis-ci.org/animist-io/whale-island.svg?branch=master)](https://travis-ci.org/animist-io/whale-island) **This project is in early development. Under construction.**

## Overview
Whale-island is a micro-computer based Ethereum client and Bluetooth beacon that connects to mobile devices via BLE server. Its API targets smart-contract logic about the physical location of mobile Dapp users but it also has Bluetooth endpoints to process transactions and provides general access to some web3 methods. Use cases for whale-island's services include:

+ Competitive races
+ Any game where the co-location of players is a key component. 
+ Path or place contingent reward programs.

Javascript libraries to help mobile Dapps interact with whale-island are in development at [animist-io/wowshuxkluh](https://github.com/animist-io/wowshuxkluh).

## Services

+ A contract to request services from whale-island nodes exists on Ethereum at: `0xf802....cde` and its Solidity file can be found at [animist-io/wallowa/contracts](https://github.com/animist-io/wallowa/blob/master/contracts/AnimistEvent.sol). Nodes continuously listen for, store and respond to events fired on this contract. 

+ Whale-island locations and their Ethereum addresses can be found at `ipfs.io/ipfs/QmY...bdG`

#### Presence verification:

You can verify a contract participant's presence at a location by:

+ Making a presence verfication request through the deployed AnimistEvent contract at `0xf802....cde` **and**

+ Implementing a public method with the signature: `verifyPresence(address visitor, uint64 time)` in your contract. 

```javascript
import 'AnimistEvent.sol';

contract Visit {

    address public client;          // Mobile client to verify presence of     
    address public node;            // Node that client should visit (from IPFS)
    address public animistAddress;  // Deployed Animist contract for events.          
    bool public visited;            // Client state prior to proximity detection        
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

    // Method mobile client could invoke on the contract by using the ethereumjs-tx library to compose 
    // the transaction and transmitting the serialized result to whale-island's sendTx endpoint.
    function rewardVisit() {
        if( msg.sender == client && visited == true){
            // Reward client
        }
    }
}
```

#### Beacon Broadcasting

You can broadcast an arbitrary beacon signal from any whale-island node by:

+ Generating a new v4 uuid with [node-uuid](https://www.npmjs.com/package/node-uuid) **and**

+ Making a beacon broadcast request through the deployed AnimistEvent contract at `0xf802....cde` **and**

+ Implementing a public method with the signature: `submitSignedBeaconId( uint8 v, bytes32 r, bytes32 s)` in your contract.

This is useful if you want to coordinate the behavior of several mobile clients in the same place by firing a brief signal (like a starting shot) that all clients will hear simultaneously. The node broadcasts the requested beacon uuid with randomly generated values for its 2 byte major / minor components. It then signs a string with form `<uuid>:<major>:<minor>` and submits it to the clients' contract via `submitSignedBeaconId `. You can verify that a client was present when the signal was fired by asking them to use their received beacon values to extract the node's address from the signed copy stored in the contract using Solidity's `ecrecover` method. 

```javascript
import 'AnimistEvent.sol';

contract Beacon {

    struct SignedBeacon {    // Storage for elliptic curve signature of beacon-signal 
        uint8 v;             // emitted by node as a start signal. 
        bytes32 r;           // (See submitSignedBeaconId and receivedMatchesSigned methods below)
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
    // components of the string '<uuid>:<major>:<minor>', signed with the node's public address. 
    function submitSignedBeaconId( uint8 v, bytes32 r, bytes32 s) public {
        signedBeacon.v = v;
        signedBeacon.r = r;
        signedBeacon.s = s;
    }

    // Method which verifies that the beacon signal heard by the client is 
    // identical to the one signed by the node. Param 'received' is a string with form:
    // <uuid>:<major>:<minor> encoding the values the client heard when it captured
    // the beacon signal. Param 'signingNode' is the address of the node the contract asked to
    // fire the beacon. 
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

You can publish a message over Bluetooth LE on an arbitrary characteristic from any whale-island node by: 

+ Generating a new v4 uuid with [node-uuid](https://www.npmjs.com/package/node-uuid) **and**

+ Making a message publication request through the deployed AnimistEvent contract at `0xf802....cde`.

```javascript
import 'AnimistEvent.sol';

contract Message {

    string public uuid;             // Arbitrary v4 characteristic uuid. 
    string public message;          // Message to publish at `uuid`
    uint32 public expires;          // Date (since Epoch ms) broadcast ends.
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
        api.requestMessagePublication(node, uuid, message, expires);    
    }
}
```

### Features

+ **Client Verification**: Nodes identify their clients by requiring that they sign a connection-specific pin published over BLE each time they submit a transaction or request services bound to their identity. While this doesn't absolutely guarantee a client is proximate to the node, it may be adequate for many moderately valued, well-designed contracts. Spoofing the node typically requires establishing parrallel physical infrastructure that relays node transmissions and client responses in real time. Whale-island can also be combined with data sources like Google geo-location to make an oracle that's harder to corrupt. Dapps that rely on client based geo-location alone are vulnerable to [programmatic spoofing](https://devs-lab.com/pokemon-go-hacks-without-moving-anywhere.html) if someone decompiles the app, engineers a way to feed arbitrary location to it and makes the resulting application available to a wider public. 

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
|INVALID_JSON_IN_REQUEST|0x02|-   |UNDEFINED|0x0E|
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






-------------------


# BluetoothLE Server Endpoints 



# onCallTx

[lib/handlers.js:384-403](https://github.com/animist-io/whale-island/blob/61934750665c78bee22c04030b3e4d0a32a4cf52/lib/handlers.js#L384-L403 "Source code on GitHub")

Executes web3.eth.call on public constant contract methods that use no gas and do not need to be signed. 
This endpoint is useful if you wish to retrieve data 'synchronously' from a contract.

**Parameters**

-   `data` **Buffer** : JSON formatted array repr. "to" and "data" fields of web3 call: `["0x84..e", "0x453e..f"]`
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 4506C117-0A27-4D90-94A1-08BB81B0738F
-   `Access` **Public** 
-   `Encrypted` **No** 

Returns **Buffer** JSON formatted string of web3.eth.call result.

# onGetAccountBalance

[lib/handlers.js:141-162](https://github.com/animist-io/whale-island/blob/61934750665c78bee22c04030b3e4d0a32a4cf52/lib/handlers.js#L141-L162 "Source code on GitHub")

Responds w/ wei balance of requested account.

**Parameters**

-   `data` **Buffer** : JSON formatted hex prefixed account address
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code: `0x00` on success or hex err.

**Properties**

-   `Subscribe` **Characteristic** A85B7044-F1C5-43AD-873A-CF923B6D62E7
-   `Access` **Public** 
-   `Encrypted` **No** 

Returns **Buffer** JSON formatted string: wei value.

Returns **Buffer** JSON formatted string: "0" on error.

# onGetBlockNumber

[lib/handlers.js:64-68](https://github.com/animist-io/whale-island/blob/61934750665c78bee22c04030b3e4d0a32a4cf52/lib/handlers.js#L64-L68 "Source code on GitHub")

Publishes current blockNumber.

**Parameters**

-   `offset`  
-   `callback`  Hex code `0x00` on success

**Properties**

-   `Read` **Characteristic** C888866C-3499-4B80-B145-E1A61620F885
-   `Access` **Public** 
-   `Encrypted` **No** 

Returns **Buffer** JSON formatted string: `"152..2"`

# onGetClientTxStatus

[lib/handlers.js:219-253](https://github.com/animist-io/whale-island/blob/61934750665c78bee22c04030b3e4d0a32a4cf52/lib/handlers.js#L219-L253 "Source code on GitHub")

Returns status data about both of the transactions that are executed in a verifyPresenceAndSendTx 
request. (Whale-island waits for the presence verification request to mined before it sends the
client transaction - this endpoint provides a way of retrieving it) Response includes info about 
the presence verification tx which may be 'pending' or 'failed', the presence verification tx hash 
(verifyPresenceTxHash) and the client's sent tx hash (clientTxHash), if available.

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 421522D1-C7EE-494C-A1E4-029BBE644E8D
-   `Access` **Pin** signed by caller account.
-   `Encrypted` **No** 

Returns **Buffer** JSON form. obj. 
`{verifyPresenceStatus: "success", verifyPresenceTxHash: "0x7d..3", clientTxHash: "0x32..e" }`

Returns **Buffer** JSON formatted null value on error.

# onGetContract

[lib/handlers.js:312-342](https://github.com/animist-io/whale-island/blob/61934750665c78bee22c04030b3e4d0a32a4cf52/lib/handlers.js#L312-L342 "Source code on GitHub")

Returns `code` and `address` of the contract which requested presence verification services for the mobile client 
at this node. Caller can use this to generate signed rawTransactions and publish them via whale-island (or elsewhere).
This is a lot of data so it gets sent in a series of packets. onGetContractIndicate handler publishes 
these as the client signals it can accept more.)

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by mobile client account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code: `0x00` on success or err.

**Properties**

-   `Subscribe` **Characteristic** BFA15C55-ED8F-47B4-BD6A-31280E98C7BA
-   `Access` **Pin** signed by caller account.
-   `Encrypted` **No** 

Returns **Buffer** JSON formatted object: `{contractAddress: "0x4f3e..a1" code: "0x5d3e..11"}`,

# onGetContractAddress

[lib/handlers.js:267-296](https://github.com/animist-io/whale-island/blob/61934750665c78bee22c04030b3e4d0a32a4cf52/lib/handlers.js#L267-L296 "Source code on GitHub")

Returns `address` of the contract which requested presence verification services for the mobile client at this node.
Caller can use this to fetch contract code from their own Ethereum light client or from a public Ethereum node 
like Infura and then generate signed rawTransactions and publish them via whale-island (or elsewhere).

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by mobile client account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code: `0x00` on success or err.

**Properties**

-   `Subscribe` **Characteristic** 007A62CC-068F-4E85-898E-7EA98AD4E31B
-   `Access` **Pin** signed by caller account.
-   `Encrypted` **No** 

Returns **Buffer** JSON formatted string (address): `0x4f3e..a1`

# onGetContractIndicate

[lib/handlers.js:352-371](https://github.com/animist-io/whale-island/blob/61934750665c78bee22c04030b3e4d0a32a4cf52/lib/handlers.js#L352-L371 "Source code on GitHub")

De-queues and sends contract code packet.

**Properties**

-   `Access` **Automatic** following onGetContract call
-   `Encrypted` **No** 

Returns **Buffer** data: queued packet of JSON formatted contract object. (see onGetContract)

Returns **Buffer** JSON formatted string "EOF" after last packet is sent.

# onGetDeviceAccount

[lib/handlers.js:49-53](https://github.com/animist-io/whale-island/blob/61934750665c78bee22c04030b3e4d0a32a4cf52/lib/handlers.js#L49-L53 "Source code on GitHub")

Publishes node's public account number.

**Parameters**

-   `offset`  
-   `callback`  Hex code `0x00` on success

**Properties**

-   `Read` **Characteristic** 1FD26CCA-EA2B-4B9E-A59E-17AA7E61A0AC
-   `Access` **Public** 
-   `Encrypted` **No** 

Returns **Buffer** JSON formatted hex prefixed account address

# onGetPgpKeyId

[lib/handlers.js:79-83](https://github.com/animist-io/whale-island/blob/61934750665c78bee22c04030b3e4d0a32a4cf52/lib/handlers.js#L79-L83 "Source code on GitHub")

Publishes a PGP keyID that can be used to fetch the nodes public PGP key from '<https://pgp.mit.edu>'.

**Parameters**

-   `offset`  
-   `callback`  Hex code `0x00` on success

**Properties**

-   `Read` **Characteristic** 75C06966-FEF2-4B23-A5AE-60BA8A5C622C
-   `Access` **Public** 
-   `Encrypted` **No** 

Returns **Buffer** JSON formatted string: `'32e6aa. . .4f922'`

# onGetPin

[lib/handlers.js:35-38](https://github.com/animist-io/whale-island/blob/61934750665c78bee22c04030b3e4d0a32a4cf52/lib/handlers.js#L35-L38 "Source code on GitHub")

Generates a new 'pin' value. A signed copy of the pin is required to access server
endpoints that execute account-specific transactions on the blockchain. 
It verifies that the message originates from a device which controls the private key for 
the transacting account. Pin is valid while the connection is open. Connection will automatically 
close if client does not make a request to one of the pin enabled endpoints within config.PIN_RESET_INTERVAL ms. 
This token also mitigates an MITM attack vector for state-changing transactions, where someone could sniff the 
encrypted packet and try to resend it.

**Parameters**

-   `offset`  
-   `callback`  Hex code `0x00` on success

**Properties**

-   `Read` **Characteristic** C40C94B3-D9FF-45A0-9A37-032D72E423A9
-   `Access` **Public** 
-   `Encrypted` **No** 

Returns **Buffer** JSON formatted 32 character alpha-numeric string (resets every ~30 sec)

# onGetPresenceReceipt

[lib/handlers.js:179-201](https://github.com/animist-io/whale-island/blob/61934750665c78bee22c04030b3e4d0a32a4cf52/lib/handlers.js#L179-L201 "Source code on GitHub")

Returns data that can be used to authenticate client's proximity to the node. 
Response includes a timestamp, the timestamp signed by the node account, and the caller's 
address signed by the node account (using web3.sign). Useful if you wish implement your own 
presence verification strategy in contract code and can run an ethereum light-client on your 
client's device, or have a server that can independently validate this data.

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code: `0x00` on success or err.

**Properties**

-   `Subscribe` **Characteristic** BA2C3091-DAB8-4D51-BF92-3A6F023E9AD7
-   `Access` **Pin** signed by caller account.

Returns **Buffer** JSON formatted object: `{time: '1453...9', signedTime: '0xaf..9e', signedAddress: '0x32...ae'}`

Returns **Buffer** JSON formatted null value on error.

# onGetTxStatus

[lib/handlers.js:99-128](https://github.com/animist-io/whale-island/blob/61934750665c78bee22c04030b3e4d0a32a4cf52/lib/handlers.js#L99-L128 "Source code on GitHub")

Responds w/ small subset of web3 data about a transaction. Useful for determining whether
or not a transaction has been mined. (blockNumber field of response will be null if tx is
pending)

**Parameters**

-   `data` **Buffer** : JSON formatted tx hash (hex prefixed)
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code: `0x00` on success or hex err.

**Properties**

-   `Subscribe` **Characteristic** 03796948-4475-4E6F-812E-18807B28A84A
-   `Access` **Public** 
-   `Encrypted` **No** 

Returns **Buffer** JSON formatted object `{ blockNumber: "150..1", nonce: "77", gas: "314..3" }`

Returns **Buffer** JSON formatted null value on error.

# onSendTx

[lib/handlers.js:417-459](https://github.com/animist-io/whale-island/blob/61934750665c78bee22c04030b3e4d0a32a4cf52/lib/handlers.js#L417-L459 "Source code on GitHub")

Sends tx as rawTransaction. Will not submit if a pending verifyPresenceAndSend request exists 
in the contractDB for this caller account. (This endpoint is intended primarily as a convenience 
for processing arbitrary method calls including contract deployments and payments.)

**Parameters**

-   `encrypted` **Object** : Encrypted, signed method call and pin `{tx: "0x123d..", pin: {v: r: s: }}`
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code: `0x00` on success or err.

**Properties**

-   `Subscribe` **Characteristic** 3340BC2C-70AE-4E7A-BE24-8B2ED8E3ED06
-   `Access` **Pin** 
-   `Encrypted` **Yes** 

Returns **Buffer** txHash:

# onVerifyPresence

[lib/handlers.js:473-510](https://github.com/animist-io/whale-island/blob/61934750665c78bee22c04030b3e4d0a32a4cf52/lib/handlers.js#L473-L510 "Source code on GitHub")

Authenticates client's proximity to node by invoking their contract's "verifyPresence" 
method with the node account.

**Parameters**

-   `encrypted` **Buffer** : encrypted JSON formatted pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 297E3B0A-F353-4531-9D44-3686CC8C4036
-   `Access` **Pin** signed by caller account.
-   `Encrypted` **Yes** 

Returns **Buffer** JSON formatted string verifyPresence tx hash.

Returns **Buffer** JSON formatted null value on error.

# onVerifyPresenceAndSendTx

[lib/handlers.js:524-566](https://github.com/animist-io/whale-island/blob/61934750665c78bee22c04030b3e4d0a32a4cf52/lib/handlers.js#L524-L566 "Source code on GitHub")

Authenticates client's proximity to node by invoking their contract's "verifyPresence" 
method with the node account. Waits for verifyPresence tx to be mined and sends clients raw transaction. 
This endpoint provides a way of authenticating and sending a transaction in a single step.

**Parameters**

-   `encrypted` **Buffer** : Encrypted JSON formatted object `{ pin: {v: r: s:}, tx: "0x32a..2d" }`
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code: `0x00` on success or err.

**Properties**

-   `Subscribe` **Characteristic** 8D8577B9-E2F0-4750-BB82-421750D9BF86
-   `Access` **Pin** signed by caller account.
-   `Encrypted` **Yes** 

Returns **Buffer** JSON formatted string repr. verifyPresence tx hash

Returns **Buffer** JSON formatted null value on error.
