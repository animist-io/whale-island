# whale-island
[![Build Status](https://travis-ci.org/animist-io/whale-island.svg?branch=master)](https://travis-ci.org/animist-io/whale-island) **This project is in early development. Unusable.**

## Overview
Whale-island is a micro-computer based Ethereum client and Bluetooth beacon that connects to mobile devices via BLE server. Its API targets contract contingencies about location but it can also be used as a simple bluetooth-Ethereum interface to process transactions, deploy contracts and call their methods. An Ionic.js module that helps hybrid mobile apps interact with whale-island is under development at [animist-io/wowshuxkluh](https://github.com/animist-io/wowshuxkluh).

### Features

+ **Client Verification**: Nodes identify their clients by asking them to sign a connection-specific pin published on a bluetooth channel. While this doesn't absolutely guarantee a client is proximate to the node, it may be adequate for many moderately valued, well-designed contracts. Spoofing the node typically requires establishing parrallel physical infrastructure that relays node transmissions and client responses in real time. Whale-island can also be combined with data sources like Google geo-location to make an oracle that's harder to corrupt. Dapps that rely on client based geo-location alone are vulnerable to [highly programmatic spoofing](http://highonandroid.com/android-apps/pokemon-go-cheathack-for-android-how-to-play-game-without-leaving-house/) if someone decompiles the app, engineers a way to feed arbitrary location to it and makes the resulting application available to a wider public. 

+ **Beacon:** iOS and Android apps that register with their OS to listen for beacon signal will wake up from a backgrounded/killed state when those signals are encountered in the environment and are allowed to run pre-defined subroutines on their device's CPU for ~90 seconds. This means you can design long-running location-based mobile dapps that automatically connect to Animist nodes and publish to the blockchain without requiring a user's explicit engagement. An example use-case for this behavior is a race where the user intentionally places a wager at the beginning and is automatically detected at the end, resolving the contest. Another would be a contract that rewards a client for visiting a location every day for a month without requiring that they check in somewhere. 

+ **Contracts/Events API:** Each node maintains its own account and has its own contract deployed to the blockchain. Dapps that call this contract's event methods and implement the Animist Solidity API in their own contract code can have a node independently verify their client's presence in time. They can also ask the node to broadcast a signal on an arbitrary channel in order to coordinate the behavior of several mobile clients in the same location. For more on how to integrate the Animist API into client contracts see [animist-io/wallowa](https://github.com/animist-io/wallowa).

+ **Presence Receipts:** Whale-island also publishes data that can verify a client's presence without invoking contract methods. Using it's own account, the node signs a timestamp and a verified copy of the clients account address. The client can then present these to an adjudicating authority who extracts the public addresses from the packet and checks the results against node identification data published on IPFS. (See Bluetooth Server API below) 

### Installation

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
|NO_ETHEREUM|0x08|-               |RESULT_SUCCESS|0x00|



### Other code documentation

[Web3 interface methods](https://github.com/animist-io/whale-island/blob/master/docs/eth.md)

[Utility methods (request parsers, etc)](https://github.com/animist-io/whale-island/blob/master/docs/util.md)






-------------------


# BluetoothLE Server Endpoints 



# onAuthAndSendTx

[lib/handlers.js:383-411](https://github.com/animist-io/whale-island/blob/f04fd43ef829dc99592f475efa0af7b3a937d0a8/lib/handlers.js#L383-L411 "Source code on GitHub")

Authenticates client's proximity to animist node by invoking their contract's "verifyPresence" 
method with the device account. Waits for auth to be mined and sends clients raw transaction. 
This endpoint provides a way of authenticating and sending a transaction in a single step.

**Parameters**

-   `data` **Buffer** : JSON formatted object { pin: {v: r: s:}, tx: "0x32a..2d" }
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 8D8577B9-E2F0-4750-BB82-421750D9BF86
-   `Access` **Pin** signed by caller account.

Returns **Buffer** JSON formatted string repr. auth transaction hash

Returns **Buffer** JSON formatted null value on error.

# onAuthTx

[lib/handlers.js:349-370](https://github.com/animist-io/whale-island/blob/f04fd43ef829dc99592f475efa0af7b3a937d0a8/lib/handlers.js#L349-L370 "Source code on GitHub")

Authenticates client's proximity to animist node by invoking their contract's "verifyPresence" 
method with the device account.

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 297E3B0A-F353-4531-9D44-3686CC8C4036
-   `Access` **Pin** signed by caller account.

Returns **Buffer** JSON formatted string auth transaction hash.

Returns **Buffer** JSON formatted null value on error.

# onCallTx

[lib/handlers.js:297-310](https://github.com/animist-io/whale-island/blob/f04fd43ef829dc99592f475efa0af7b3a937d0a8/lib/handlers.js#L297-L310 "Source code on GitHub")

Executes web3.eth.call on public constant contract methods that use no gas and do not need to be signed. 
This endpoint is useful if you wish to retrieve data 'synchronously' from a contract.

**Parameters**

-   `data` **Buffer** : JSON formatted array repr. "to" and "data" fields of web3 call: ["0x84..e", "0x453e..f"]
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 4506C117-0A27-4D90-94A1-08BB81B0738F
-   `Access` **Public** 

Returns **Buffer** JSON formatted string of web3.eth.call result.

# onGetAccountBalance

[lib/handlers.js:132-147](https://github.com/animist-io/whale-island/blob/f04fd43ef829dc99592f475efa0af7b3a937d0a8/lib/handlers.js#L132-L147 "Source code on GitHub")

Responds w/ wei balance of requested account.

**Parameters**

-   `data` **Buffer** : JSON formatted hex prefixed account address
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** A85B7044-F1C5-43AD-873A-CF923B6D62E7
-   `Access` **Public** 

Returns **Buffer** JSON formatted string: wei value.

Returns **Buffer** JSON formatted string: "0" on error.

# onGetBlockNumber

[lib/handlers.js:52-55](https://github.com/animist-io/whale-island/blob/f04fd43ef829dc99592f475efa0af7b3a937d0a8/lib/handlers.js#L52-L55 "Source code on GitHub")

Publishes current blockNumber.

**Parameters**

-   `offset`  
-   `callback`  Hex code 0x00 on success

**Properties**

-   `Read` **Characteristic** C888866C-3499-4B80-B145-E1A61620F885
-   `Access` **Public** 

Returns **Buffer** JSON formatted string: "152..2"

# onGetContract

[lib/handlers.js:233-257](https://github.com/animist-io/whale-island/blob/f04fd43ef829dc99592f475efa0af7b3a937d0a8/lib/handlers.js#L233-L257 "Source code on GitHub")

Begins sending contract code plus a session id / expiration time to the client in a series of packets. 
onGetContractIndicate handler publishes the rest as the client signals it can accept more.

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** BFA15C55-ED8F-47B4-BD6A-31280E98C7BA
-   `Access` **Pin** signed by caller account.

Returns **Buffer** JSON formatted object: {code: '0x5d3e..11', sessionId: '4ydw2..2', expires: '5732..1'}

# onGetContractIndicate

[lib/handlers.js:266-285](https://github.com/animist-io/whale-island/blob/f04fd43ef829dc99592f475efa0af7b3a937d0a8/lib/handlers.js#L266-L285 "Source code on GitHub")

De-queues and sends contract code packet.

**Properties**

-   `Access` **Automatic** following onGetContract call

Returns **Buffer** data: queued packet of JSON formatted contract object. (see onGetContract)

Returns **Buffer** JSON formatted string "EOF" after last packet is sent.

# onGetDeviceAccount

[lib/handlers.js:39-42](https://github.com/animist-io/whale-island/blob/f04fd43ef829dc99592f475efa0af7b3a937d0a8/lib/handlers.js#L39-L42 "Source code on GitHub")

Publishes animist node's public account number.

**Parameters**

-   `offset`  
-   `callback`  Hex code 0x00 on success

**Properties**

-   `Read` **Characteristic** 1FD26CCA-EA2B-4B9E-A59E-17AA7E61A0AC
-   `Access` **Public** 

Returns **Buffer** JSON formatted hex prefixed account address

# onGetNewSessionId

[lib/handlers.js:100-120](https://github.com/animist-io/whale-island/blob/f04fd43ef829dc99592f475efa0af7b3a937d0a8/lib/handlers.js#L100-L120 "Source code on GitHub")

Generates, saves and responds with new session id linked to caller account.

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 9BBA5055-57CA-4F78-BA61-52F4154382CF
-   `Access` **Pin** signed by caller account.

Returns **Buffer** JSON formatted object { sessionId: "a34..4q', expires: '435...01', account: '0x78ef..a' }

Returns **Buffer** JSON formatted null value on error.

# onGetPin

[lib/handlers.js:26-29](https://github.com/animist-io/whale-island/blob/f04fd43ef829dc99592f475efa0af7b3a937d0a8/lib/handlers.js#L26-L29 "Source code on GitHub")

Publishes current 'pin' value. This updates every ~30sec and a caller
signed copy of it is required to access some of the server's endpoints. It's used 
to help verify client is present 'in time'.

**Parameters**

-   `offset`  
-   `callback`  Hex code 0x00 on success

**Properties**

-   `Read` **Characteristic** C40C94B3-D9FF-45A0-9A37-032D72E423A9
-   `Access` **Public** 

Returns **Buffer** JSON formatted 32 character alpha-numeric string (resets every ~30 sec)

# onGetPresenceReceipt

[lib/handlers.js:164-180](https://github.com/animist-io/whale-island/blob/f04fd43ef829dc99592f475efa0af7b3a937d0a8/lib/handlers.js#L164-L180 "Source code on GitHub")

Returns data that can be used to authenticate client's proximity to the animist node. 
Response includes a timestamp, the timestamp signed by the device account, and the caller's 
address signed by the device account (using web3.sign). Useful if you wish implement your own 
presence verification strategy in contract code and can run an ethereum light-client on your 
client's device, or have a server that can independently validate this data.

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** BA2C3091-DAB8-4D51-BF92-3A6F023E9AD7
-   `Access` **Pin** signed by caller account.

Returns **Buffer** JSON formatted object: {time: '1453...9', signedTime: '0xaf..9e', signedAddress: '0x32...ae'}

Returns **Buffer** JSON formatted null value on error.

# onGetTxStatus

[lib/handlers.js:69-88](https://github.com/animist-io/whale-island/blob/f04fd43ef829dc99592f475efa0af7b3a937d0a8/lib/handlers.js#L69-L88 "Source code on GitHub")

Responds w/ small subset of web3 data about a transaction. Useful for determining whether
or not a transaction has been mined. (blockNumber field of response will be null if tx is
pending)

**Parameters**

-   `data` **Buffer** : JSON formatted tx hash (hex prefixed)
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 03796948-4475-4E6F-812E-18807B28A84A
-   `Access` **Public** 

Returns **Buffer** JSON formatted object { blockNumber: "150..1", nonce: "77", gas: "314..3" }

Returns **Buffer** JSON formatted null value on error.

# onGetVerifiedTxStatus

[lib/handlers.js:195-220](https://github.com/animist-io/whale-island/blob/f04fd43ef829dc99592f475efa0af7b3a937d0a8/lib/handlers.js#L195-L220 "Source code on GitHub")

Returns status data about a transaction submitted in an atomic authAndSend request. 
Response includes info about the authenticating tx which may be 'pending' or 'failed' 
if authTx is unmined or ran out of gas, as well as the auth tx hash and the client's sent tx
hash (if available)

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 421522D1-C7EE-494C-A1E4-029BBE644E8D
-   `Access` **Pin** signed by caller account.

Returns **Buffer** JSON form. obj. {authStatus: "success", authTxHash: "0x7d..3", verifiedTxHash: "0x32..e" }

Returns **Buffer** JSON formatted null value on error.

# onSendTx

[lib/handlers.js:324-336](https://github.com/animist-io/whale-island/blob/f04fd43ef829dc99592f475efa0af7b3a937d0a8/lib/handlers.js#L324-L336 "Source code on GitHub")

Sends tx as rawTransaction if tx signer's sessionId is valid. Will not submit if
a pending authAndSend request exists in the contractDB for this caller account. 
(This endpoint is intended primarily as a convenience for processing non-authed method calls, 
including contract deployments and payments.)

**Parameters**

-   `data` **Object** : signed method call and sessionId {tx: "0x123d..", sessionId: "9tfh1..v"}]
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 3340BC2C-70AE-4E7A-BE24-8B2ED8E3ED06
-   `Access` **SessionId** 

Returns **Buffer** verifiedTxHash: hash of verified transaction
