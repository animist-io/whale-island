# whale-island
[![Build Status](https://travis-ci.org/animist-io/whale-island.svg?branch=master)](https://travis-ci.org/animist-io/whale-island)

(This repo is in the earliest stages of development. Unusable.)

A micro-computer based Ethereum client and Bluetooth beacon that connects to mobile devices with a BLE server. Its API targets contract contingencies about location. 


### Installation Notes:

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

### CLI:

Tests (set env var TRAVIS to true simulate Travis CI execution)
```
$ mocha --timeout 5s 

$ export TRAVIS=true
$ mocha --timeout 5s 
$ unset TRAVIS
```

Run Server
```
% node lib/server.js start
```

Generate Docs
```
% gulp documentation
```




-------------------
# BLE API Endpoints
-------------------


# onAuthAndSubmitTx

[lib/handlers.js:293-321](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/handlers.js#L293-L321 "Source code on GitHub")

Gets contract, auths and passes signed tx and the auth hash to submitTxWhenAuthed. 
Sends auth transaction receipt.  
Subscribe/write to: 8D8577B9-E2F0-4750-BB82-421750D9BF86

**Parameters**

-   `data` **object** : JSON object { pin: signedPin, tx: signed functionTx }
-   `offset`  
-   `response`  
-   `callback`  

Returns **Number** code: init response is hex code callback. 0x00 on success or err.

Returns **Buffer** authTxHash: JSON string (or 'null' on error) transaction hash.

# onAuthTx

[lib/handlers.js:262-283](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/handlers.js#L262-L283 "Source code on GitHub")

Locates contract event about the calling account and auths it ( e.g. prints a timestamped
verification of callers presence to contract - see eth.authTx ). Responds w/ auth tx hash.  
Subscribe/write to: 297E3B0A-F353-4531-9D44-3686CC8C4036

**Parameters**

-   `pin` **String** : current endpoint pin value, signed by caller account.
-   `data`  
-   `offset`  
-   `response`  
-   `callback`  

Returns **Number** code: init response is hex code callback. 0x00 on success or err.

Returns **Buffer** authTxHash: JSON string (or 'null' on error) transaction hash.

# onCallTx

[lib/handlers.js:210-223](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/handlers.js#L210-L223 "Source code on GitHub")

Executes web3.eth.call on methods that use no gas and do not need to be signed. Sends result.
(Public: Does not require a signed pin).  
Subscribe/write to: 4506C117-0A27-4D90-94A1-08BB81B0738F

**Parameters**

-   `data` **String** : JSON stringified array w/form [hexString to, hexString code]
-   `offset`  
-   `response`  
-   `callback`  

Returns **Number** code: init response is hex code callback. 0x00 on success or err.

Returns **Buffer** eof: JSON string of web3.eth.call result.

# onGetBlockNumber

[lib/handlers.js:33-36](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/handlers.js#L33-L36 "Source code on GitHub")

Publishes current blockNumber. (Public: does not require a signed pin).  
Read: C888866C-3499-4B80-B145-E1A61620F885

**Parameters**

-   `offset`  
-   `callback`  

Returns **Buffer** blockNumber: JSON string repr. int value converted to string.

# onGetContractIndicate

[lib/handlers.js:180-199](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/handlers.js#L180-L199 "Source code on GitHub")

Fetches contract referencing the caller account. Writes the contract code plus a session id / expiration 
out to the client in a series of packets. This fn sends the first of these - onGetContractIndicate 
sends the rest as the client signals it can accept more. (Uses a timeout per bleno/issues/170 )

Returns **Buffer** data: part of a JSONed contract object sitting in send queue. (see onGetContract)

Returns **Buffer** eof: JSON string EOF after last packet is sent.

# onGetContractWrite

[lib/handlers.js:146-170](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/handlers.js#L146-L170 "Source code on GitHub")

Sends contract code plus a session id / expiration in a series of packets. This handler
sends the first of these - onGetContractIndicate sends the rest as the client signals it can 
accept more.  
Subscribe/write to: BFA15C55-ED8F-47B4-BD6A-31280E98C7BA

**Parameters**

-   `data` **String** : current endpoint pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback`  

Returns **Number** code: init response is hex code callback. 0x00 on success or err.

Returns **Buffer** data: JSON object (or null string) contract data incl. code, session data.

# onGetNewSessionId

[lib/handlers.js:75-95](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/handlers.js#L75-L95 "Source code on GitHub")

Generates, saves and sends a new session id. ( Requires: valid SessionId ).  
Subscribe/write to: 9BBA5055-57CA-4F78-BA61-52F4154382CF

**Parameters**

-   `data` **String** : current endpoint pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback`  

Returns **Number** code: init response is hex code callback. 0x00 on success or err.

Returns **Buffer** session: JSON object (or 'null' string) { sessionId: string, expires: int, account: address }

# onGetPin

[lib/handlers.js:22-25](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/handlers.js#L22-L25 "Source code on GitHub")

Publishes current time pin value. (Public: does not require a signed pin).  
Read C40C94B3-D9FF-45A0-9A37-032D72E423A9

**Parameters**

-   `offset`  
-   `callback`  

Returns **Buffer** pin: 32 character alpha-numeric string (resets every ~30 sec)

# onGetSubmittedTxHash

[lib/handlers.js:108-133](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/handlers.js#L108-L133 "Source code on GitHub")

Sends the transaction hash of a tx submitted in an atomic authAndSubmit 
request. This is available once the AuthTx has been mined and caller's tx has
been published to chain. Also returns authStatus data which may be 'pending' or
'failed' if authTx is unmined or ran out of gas.  
Subscribe/write to: 421522D1-C7EE-494C-A1E4-029BBE644E8D

**Parameters**

-   `data` **String** : current endpoint pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback`  

Returns **Number** code: init response is hex code callback. 0x00 on success or err.

Returns **Buffer** txHash: JSON string, hash or 'null' on error

# onGetTxStatus

[lib/handlers.js:46-65](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/handlers.js#L46-L65 "Source code on GitHub")

Responds w/ some web3 data about a tx. (Public: does not require a signed pin).  
Subscribe/write to: 03796948-4475-4E6F-812E-18807B28A84A

**Parameters**

-   `data` **String** : hex prefixed tx hash
-   `offset`  
-   `response`  
-   `callback`  

Returns **Number** code: init response is hex code callback. 0x00 on success or err.

Returns **Buffer** status: JSON object (or 'null' string) { blockNumber: int OR null, nonce: int, gas: int }

# onSubmitTx

[lib/handlers.js:237-251](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/handlers.js#L237-L251 "Source code on GitHub")

Sends tx as rawTransaction if tx signer's sessionId is valid. Will not submit if
an unstarted or pending authAndSubmit tx exists in the contractDB for this caller account.
(This endpoint is a convenience for processing non-authed method calls (including contract
deployments) and payments. It cannot be used for presence verification in combination 
with a separate call to authTx. Auth's must be done atomically using the authAndSubmit endpoint).  
Subscribe/write to: 3340BC2C-70AE-4E7A-BE24-8B2ED8E3ED06

**Parameters**

-   `data` **Object** : {tx: signed method call, sessionId: animist session id}]
-   `offset`  
-   `response`  
-   `callback`  

Returns **Number** code: init response is hex code callback. 0x00 on success or err.

Returns **Buffer** submittedTxHash: hash of submitted transaction


-------------------------
# Web3 Interface 
-------------------------


# authTx

[lib/eth.js:147-163](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/eth.js#L147-L163 "Source code on GitHub")

Invokes verifyPresence on the contract discovered in the contractsDB. 
verifyPresence prints caller was here, 'timestamped' now, to chain.

**Parameters**

-   `pin`  
-   `signed`  

Returns **Promise** Resolves hash string of pending AuthTx

Returns **Promise** Rejects w/ hex code: NO_TX_FOUND

# callTx

[lib/eth.js:84-86](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/eth.js#L84-L86 "Source code on GitHub")

Wraps web3.eth.call. Method should require no gas and no "from" parameter. See onCallTx

**Parameters**

-   `method` **String** : a call to constant public function

Returns **String** hex encoded value per web3

# getBlockNumber

[lib/eth.js:73-75](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/eth.js#L73-L75 "Source code on GitHub")

Wraps web3.eth.blockNumber.

Returns **Number** 

# getContract

[lib/eth.js:120-138](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/eth.js#L120-L138 "Source code on GitHub")

Extracts address from signed pin and looks for record from contractsDB with that id.

**Parameters**

-   `pin`  
-   `signed`  

**Examples**

```javascript
Sample contract event object:    
{
code: '0x453ce...03' (long contract code string), 
account: '0x757fe...04' (account addr. specified in the contract event, should be endpoint caller) 
authority: '0x251ae...05' (account addr. designated to sign transactions for this contract on behalf of caller)
contractAddress: '0x821af...05' (address of deployed contract).
}
```

Returns **Promise** Resolves contract event record

Returns **Promise** Rejects with hex code: NO_TX_DB_ERR or NO_TX_ADDR_ERR

# getTx

[lib/eth.js:94-104](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/eth.js#L94-L104 "Source code on GitHub")

Queries blockchain for transaction receipt.

**Parameters**

-   `txHash`  

Returns **Promise** Resolves { blocknumber: int (or null), nonce: int, gas: int }

Returns **Promise** Rejects w/ hex code: NO_TX_DB_ERR

# recover

[lib/eth.js:48-64](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/eth.js#L48-L64 "Source code on GitHub")

Recovers address used to sign a message, which may be encoded in eth-lightwallet or web3.sign 
formats. (Will generate non-existent address if data signed and 'rawMsg' are not identical.

**Parameters**

-   `rawMsg` **String** : the endpoints currently broadcast pin
-   `signed` **Object or String** : a value signed by the callers account

Returns **String** account: hex prefixed public address of msg signer.

Returns **** undefined if ethereumjs-util throws an error during recovery.

# submitTx

[lib/eth.js:171-173](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/eth.js#L171-L173 "Source code on GitHub")

Prints client-signed tx to blockchain. A wrapper for web3 sendRawTransaction.

**Parameters**

-   `tx` **String** : a signed transaction

Returns **String** txHash of sendRawTransaction

# submitTxWhenAuthed

[lib/eth.js:184-256](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/eth.js#L184-L256 "Source code on GitHub")

Waits for auth tx to be mined then submits tx. Updates client's contract record with auth status when 
pending, successful, failed and saves signedTx transaction hash to record on success.

**Parameters**

-   `authTxHash` **String** : hash of pending presence verification tx submitted by animist device
-   `signedTx` **String** : signed tx submittable w/ eth.sendRawTransaction
-   `address` **String** : the client account address
-   `cb` **Function** : optional callback for unit testing.


----------------------------------
# Parsers and Misc Utility Methods
----------------------------------


# activateQueue

[lib/util.js:81-81](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/util.js#L81-L81 "Source code on GitHub")

Sets flag to begin multi-packet message send

# canSubmitTx

[lib/util.js:290-326](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/util.js#L290-L326 "Source code on GitHub")

Validates sessionId, guarantees that sessionId was issued to tx signer, rejects
tx submissions for clients who need to auth or while an atomic AuthAndSubmit is in progress.

**Parameters**

-   `data` **String** : JSON formatted {id: string ID, tx: string signedTx }

Returns **Promise** Resolves w/ {ok: true, val: string signedTx }

Returns **Promise** Rejects w/  {ok: false, val: hex error code }

# deactivateQueue

[lib/util.js:87-87](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/util.js#L87-L87 "Source code on GitHub")

Unset multi-packet message send flag

# deQueue

[lib/util.js:68-68](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/util.js#L68-L68 "Source code on GitHub")

DeQueues a packet from the send queue. This data structure is used to transmit long 
messages like contract code which exceed that maximum msg length for BLE

Returns **Buffer** packet: Part of a queued messsage.

# extractPinFromJSON

[lib/util.js:133-150](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/util.js#L133-L150 "Source code on GitHub")

Retrieves pin from incoming data as string or eth-lightwallet object.

**Parameters**

-   `data` **String** : JSON formatted string or object

Returns **String or Object** signedPin: returns null on error.

# getPin

[lib/util.js:50-50](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/util.js#L50-L50 "Source code on GitHub")

PIN getter. Writes/auths and sessions on the server require the mobile client to
sign this value w/the account they're executing txs with. The pin makes the endpoint 
slightly harder to spoof by requiring you read a value in real-time.

Returns **String** pin: A 32 character alpha-numeric random value.

# isQueueActive

[lib/util.js:93-93](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/util.js#L93-L93 "Source code on GitHub")

Get queue state, boolean active OR inactive.

Returns **Boolean** state

# isValidSession

[lib/util.js:360-371](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/util.js#L360-L371 "Source code on GitHub")

Verifies session id still exists and was issued to caller.

**Parameters**

-   `id`  
-   `tx`  

Returns **Promise** Resolves if id is ok.

Returns **Promise** Rejects otherwise.

# parseCall

[lib/util.js:267-281](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/util.js#L267-L281 "Source code on GitHub")

Parses call data string into object that can be given as param to web3.eth.call

**Parameters**

-   `data` **String** : JSON string repr. array (len 2) of hex prefixed strings.

Returns **Object** result: { ok: boolean status, val: {to: string, data: string} OR hex error code}

# parseSessionId

[lib/util.js:248-259](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/util.js#L248-L259 "Source code on GitHub")

Verifies that JSON input has minimum formal properties of a sessionId and returns id as string.

**Parameters**

-   `data` **object** : JSON formatted object {id: sessionId string, tx: signedTx string }

Returns **object** parsed: {ok: boolean status, val: sessionId string OR hex error code}

# parseSignedPin

[lib/util.js:158-180](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/util.js#L158-L180 "Source code on GitHub")

Validates format of signedPin (A check done before extracting address from it).

**Parameters**

-   `data` **String** : JSON formatted signed string OR an object with v,r,s fields.

Returns **Object** parsed:  { ok: boolean status, val: signed pin OR hex error code }

# parseSignedTx

[lib/util.js:190-222](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/util.js#L190-L222 "Source code on GitHub")

Checks that signed tx object is valid - i.e. that it was signed by the same sender
that signed the pin, that the signature verifies and tx's gas limit is sufficient.

**Parameters**

-   `data` **String** : JSON formatted signed transaction object
-   `client` **String** : hex prefixed address extracted from pin signing

Returns **Object** parsed: {ok: boolean status, val: tx string or error code }

# parseTxHash

[lib/util.js:229-240](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/util.js#L229-L240 "Source code on GitHub")

Verifies that JSON input has minimum formal properties of tx hash and returns hash as string.

**Parameters**

-   `data`  

Returns **Object** parsed: { ok: boolean status, val: txHash string OR hex error code  }

# queueActive

[lib/util.js:37-37](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/util.js#L37-L37 "Source code on GitHub")

# queueContract

[lib/util.js:101-124](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/util.js#L101-L124 "Source code on GitHub")

Converts a tx object into an array of buffers whose largest size is MAX_SEND 

-   e.g. the maximum number of bytes that can be sent in a packet.

**Parameters**

-   `code` **Object** :
-   `tx`  

# queueLength

[lib/util.js:75-75](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/util.js#L75-L75 "Source code on GitHub")

Gets number of packets remaining to send.

Returns **Number** length

# resetPin

[lib/util.js:56-59](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/util.js#L56-L59 "Source code on GitHub")

Generates a new pin. Keeps track of old pin until next reset.

# startSession

[lib/util.js:338-352](https://github.com/animist-io/whale-island/blob/3da5c0ef65da6210373a8908fd5a0f18dd4aecc6/lib/util.js#L338-L352 "Source code on GitHub")

Generates & saves session id record. Session id is required to submit an arbitrary tx
and is used to prevent clients from publishing txs that need endpoint auth non-atomically.
Session gets deleted after config.SESSION_LENGTH.

**Parameters**

-   `tx` **Object** : Should contain at least an "account" field. May be a contract event object.

Returns **Promise** tx object updates w/ fields, sessionId: string, expires: int, account: string

Returns **Promise** hex error code
