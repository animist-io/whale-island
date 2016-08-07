# onAuthAndSendTx

[lib/handlers.js:307-335](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/handlers.js#L307-L335 "Source code on GitHub")

Auths client by invoking their contract's "verifyPresence" method with the device account. 
Waits for auth to be mined and sends clients raw transaction. This endpoint provides a way of 
authenticating and sending a transaction in a single step.

**Parameters**

-   `data` **Buffer** : JSON formatted object { pin: {v: r: s:}, tx: "0x32a..2d" }
-   `offset`  
-   `response`  
-   `callback` **Buffer** : init response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 8D8577B9-E2F0-4750-BB82-421750D9BF86
-   `Access` **Pin** 

Returns **Buffer** JSON formatted string repr. auth transaction hash

Returns **Buffer** JSON formatted string "null" on error.

# onAuthTx

[lib/handlers.js:273-294](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/handlers.js#L273-L294 "Source code on GitHub")

Auths client by invoking their contract's "verifyPresence" method with the device account.

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : init response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 297E3B0A-F353-4531-9D44-3686CC8C4036
-   `Access` **Pin** 

Returns **Buffer** JSON formatted string auth transaction hash.

Returns **Buffer** JSON formatted string "null" on error.

# onCallTx

[lib/handlers.js:220-233](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/handlers.js#L220-L233 "Source code on GitHub")

Executes web3.eth.call on methods that use no gas and do not need to be signed.

**Parameters**

-   `data` **Buffer** : JSON formatted array repr. "to" and "data" fields of web3 call: ["0x84..e", "0x453e..f"]
-   `offset`  
-   `response`  
-   `callback` **Buffer** : init response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 4506C117-0A27-4D90-94A1-08BB81B0738F
-   `Access` **Public** 

Returns **Buffer** JSON formatted string of web3.eth.call result.

# onGetBlockNumber

[lib/handlers.js:37-40](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/handlers.js#L37-L40 "Source code on GitHub")

Publishes current blockNumber.

**Parameters**

-   `offset`  
-   `callback`  Hex code 0x00 on success

**Properties**

-   `Read` **Characteristic** C888866C-3499-4B80-B145-E1A61620F885
-   `Access` **Public** 

Returns **Buffer** JSON formatted string: "152..2"

# onGetContract

[lib/handlers.js:157-181](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/handlers.js#L157-L181 "Source code on GitHub")

Begins sending contract code plus a session id / expiration out to the client in a series of packets. 
onGetContractIndicate handler publishes the rest as the client signals it can accept more.

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : init response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** BFA15C55-ED8F-47B4-BD6A-31280E98C7BA
-   `Access` **Pin** 

Returns **Buffer** JSON formatted object: {code: '0x5d3e..11', sessionId: '4ydw2..2', expires: '5732..1'}

# onGetContractIndicate

[lib/handlers.js:190-209](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/handlers.js#L190-L209 "Source code on GitHub")

DeQueues and sends contract code packet.

**Properties**

-   `Access` **Automatic** following onGetContract call

Returns **Buffer** data: queued packet of JSON formatted contract object. (see onGetContract)

Returns **Buffer** JSON formatted string "EOF" after last packet is sent.

# onGetNewSessionId

[lib/handlers.js:85-105](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/handlers.js#L85-L105 "Source code on GitHub")

Generates, saves and sends a new session id.

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : init response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 9BBA5055-57CA-4F78-BA61-52F4154382CF
-   `Access` **Pin** 

Returns **Buffer** JSON formatted object { sessionId: "a34..4q', expires: '435...01', account: '0x78ef..a' }

Returns **Buffer** JSON formatted string "null" on error.

# onGetPin

[lib/handlers.js:24-27](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/handlers.js#L24-L27 "Source code on GitHub")

Publishes current time pin value.

**Parameters**

-   `offset`  
-   `callback`  Hex code 0x00 on success

**Properties**

-   `Read` **Characteristic** C40C94B3-D9FF-45A0-9A37-032D72E423A9
-   `Access` **Public** 

Returns **Buffer** JSON formatted 32 character alpha-numeric string (resets every ~30 sec)

# onGetTxStatus

[lib/handlers.js:54-73](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/handlers.js#L54-L73 "Source code on GitHub")

Responds w/ small subset of web3 data about a transaction. Useful for determining whether
or not a transaction has been mined. (blockNumber field of response will be null if tx is
pending)

**Parameters**

-   `data` **Buffer** : JSON formatted tx hash (hex prefixed)
-   `offset`  
-   `response`  
-   `callback` **Buffer** : init response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 03796948-4475-4E6F-812E-18807B28A84A
-   `Access` **Public** 

Returns **Buffer** JSON formatted object { blockNumber: "150..1", nonce: "77", gas: "314..3" }

Returns **Buffer** JSON formatted string "null" on error.

# onGetVerifiedTxHash

[lib/handlers.js:119-144](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/handlers.js#L119-L144 "Source code on GitHub")

Sends the hash of a transaction sent in an atomic authAndSend request. This is available once 
the AuthTx has been mined and caller's tx has been published to chain. Also returns authStatus 
data which may be 'pending' or 'failed' if authTx is unmined or ran out of gas.

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : init response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 421522D1-C7EE-494C-A1E4-029BBE644E8D
-   `Access` **Pin** 

Returns **Buffer** JSON formatted string txhash: "0x7d34e..023"

Returns **Buffer** JSON formatted string "null" on error.

# onSendTx

[lib/handlers.js:247-261](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/handlers.js#L247-L261 "Source code on GitHub")

Sends tx as rawTransaction if tx signer's sessionId is valid. Will not submit if
a pending authAndSubmit tx exists in the contractDB for this caller account. 
(This endpoint is intended primarily as a convenience for processing non-authed method calls, 
including contract deployments and payments.)

**Parameters**

-   `data` **Object** : signed method call and sessionId {tx: "0x123d..", sessionId: "9tfh1..v"}]
-   `offset`  
-   `response`  
-   `callback` **Buffer** : init response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 3340BC2C-70AE-4E7A-BE24-8B2ED8E3ED06
-   `Access` **SessionId** 

Returns **Buffer** verifiedTxHash: hash of verified transaction