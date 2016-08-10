# onAuthAndSendTx

[lib/handlers.js:383-411](https://github.com/animist-io/whale-island/blob/fb7a27bc8652afd790c70ba0d1b09ea7275cb769/lib/handlers.js#L383-L411 "Source code on GitHub")

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
-   `Access` **Pin** 

Returns **Buffer** JSON formatted string repr. auth transaction hash

Returns **Buffer** JSON formatted null value on error.

# onAuthTx

[lib/handlers.js:349-370](https://github.com/animist-io/whale-island/blob/fb7a27bc8652afd790c70ba0d1b09ea7275cb769/lib/handlers.js#L349-L370 "Source code on GitHub")

Authenticates client's proximity to animist node by invoking their contract's "verifyPresence" 
method with the device account.

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 297E3B0A-F353-4531-9D44-3686CC8C4036
-   `Access` **Pin** 

Returns **Buffer** JSON formatted string auth transaction hash.

Returns **Buffer** JSON formatted null value on error.

# onCallTx

[lib/handlers.js:295-308](https://github.com/animist-io/whale-island/blob/fb7a27bc8652afd790c70ba0d1b09ea7275cb769/lib/handlers.js#L295-L308 "Source code on GitHub")

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

[lib/handlers.js:130-145](https://github.com/animist-io/whale-island/blob/fb7a27bc8652afd790c70ba0d1b09ea7275cb769/lib/handlers.js#L130-L145 "Source code on GitHub")

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

[lib/handlers.js:50-53](https://github.com/animist-io/whale-island/blob/fb7a27bc8652afd790c70ba0d1b09ea7275cb769/lib/handlers.js#L50-L53 "Source code on GitHub")

Publishes current blockNumber.

**Parameters**

-   `offset`  
-   `callback`  Hex code 0x00 on success

**Properties**

-   `Read` **Characteristic** C888866C-3499-4B80-B145-E1A61620F885
-   `Access` **Public** 

Returns **Buffer** JSON formatted string: "152..2"

# onGetContract

[lib/handlers.js:231-255](https://github.com/animist-io/whale-island/blob/fb7a27bc8652afd790c70ba0d1b09ea7275cb769/lib/handlers.js#L231-L255 "Source code on GitHub")

Begins sending contract code plus a session id / expiration time to the client in a series of packets. 
onGetContractIndicate handler publishes the rest as the client signals it can accept more.

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** BFA15C55-ED8F-47B4-BD6A-31280E98C7BA
-   `Access` **Pin** 

Returns **Buffer** JSON formatted object: {code: '0x5d3e..11', sessionId: '4ydw2..2', expires: '5732..1'}

# onGetContractIndicate

[lib/handlers.js:264-283](https://github.com/animist-io/whale-island/blob/fb7a27bc8652afd790c70ba0d1b09ea7275cb769/lib/handlers.js#L264-L283 "Source code on GitHub")

De-queues and sends contract code packet.

**Properties**

-   `Access` **Automatic** following onGetContract call

Returns **Buffer** data: queued packet of JSON formatted contract object. (see onGetContract)

Returns **Buffer** JSON formatted string "EOF" after last packet is sent.

# onGetDeviceAccount

[lib/handlers.js:37-40](https://github.com/animist-io/whale-island/blob/fb7a27bc8652afd790c70ba0d1b09ea7275cb769/lib/handlers.js#L37-L40 "Source code on GitHub")

Publishes animist node's public account number.

**Parameters**

-   `offset`  
-   `callback`  Hex code 0x00 on success

**Properties**

-   `Read` **Characteristic** 1FD26CCA-EA2B-4B9E-A59E-17AA7E61A0AC
-   `Access` **Public** 

Returns **Buffer** JSON formatted hex prefixed account address

# onGetNewSessionId

[lib/handlers.js:98-118](https://github.com/animist-io/whale-island/blob/fb7a27bc8652afd790c70ba0d1b09ea7275cb769/lib/handlers.js#L98-L118 "Source code on GitHub")

Generates, saves and responds with new session id linked to caller account.

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 9BBA5055-57CA-4F78-BA61-52F4154382CF
-   `Access` **Pin** 

Returns **Buffer** JSON formatted object { sessionId: "a34..4q', expires: '435...01', account: '0x78ef..a' }

Returns **Buffer** JSON formatted null value on error.

# onGetPin

[lib/handlers.js:24-27](https://github.com/animist-io/whale-island/blob/fb7a27bc8652afd790c70ba0d1b09ea7275cb769/lib/handlers.js#L24-L27 "Source code on GitHub")

Publishes current time pin value.

**Parameters**

-   `offset`  
-   `callback`  Hex code 0x00 on success

**Properties**

-   `Read` **Characteristic** C40C94B3-D9FF-45A0-9A37-032D72E423A9
-   `Access` **Public** 

Returns **Buffer** JSON formatted 32 character alpha-numeric string (resets every ~30 sec)

# onGetPresenceReceipt

[lib/handlers.js:162-178](https://github.com/animist-io/whale-island/blob/fb7a27bc8652afd790c70ba0d1b09ea7275cb769/lib/handlers.js#L162-L178 "Source code on GitHub")

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
-   `Access` **Pin** 

Returns **Buffer** JSON formatted object: {time: '1453...9', signedTime: '0xaf..9e', signedAddress: '0x32...ae'}

Returns **Buffer** JSON formatted null value on error.

# onGetTxStatus

[lib/handlers.js:67-86](https://github.com/animist-io/whale-island/blob/fb7a27bc8652afd790c70ba0d1b09ea7275cb769/lib/handlers.js#L67-L86 "Source code on GitHub")

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

# onGetVerifiedTxHash

[lib/handlers.js:193-218](https://github.com/animist-io/whale-island/blob/fb7a27bc8652afd790c70ba0d1b09ea7275cb769/lib/handlers.js#L193-L218 "Source code on GitHub")

Responds with the hash of a transaction submitted by an atomic authAndSend request. 
Hash is available once the authTx has been mined and caller's transaction has been 
published to chain. Also returns authStatus data which may be 'pending' or 'failed' 
if authTx is unmined or ran out of gas.

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 421522D1-C7EE-494C-A1E4-029BBE644E8D
-   `Access` **Pin** 

Returns **Buffer** JSON form. obj. {authStatus: "success", authTxHash: "0x7d..3", verifiedTxHash: "0x32..e" }

Returns **Buffer** JSON formatted null value on error.

# onSendTx

[lib/handlers.js:322-336](https://github.com/animist-io/whale-island/blob/fb7a27bc8652afd790c70ba0d1b09ea7275cb769/lib/handlers.js#L322-L336 "Source code on GitHub")

Sends tx as rawTransaction if tx signer's sessionId is valid. Will not submit if
a pending authAndSubmit request exists in the contractDB for this caller account. 
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
