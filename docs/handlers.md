# onAuthAndSendTx

[lib/handlers.js:381-409](https://github.com/animist-io/whale-island/blob/87111f2b1e79a30f45af7e2e6726a9d780f1f032/lib/handlers.js#L381-L409 "Source code on GitHub")

Auths client by invoking their contract's "verifyPresence" method with the device account. 
Waits for auth to be mined and sends clients raw transaction. This endpoint provides a way of 
authenticating and sending a transaction in a single step.

**Parameters**

-   `data` **Buffer** : JSON formatted object { pin: {v: r: s:}, tx: "0x32a..2d" }
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 8D8577B9-E2F0-4750-BB82-421750D9BF86
-   `Access` **Pin** 

Returns **Buffer** JSON formatted string repr. auth transaction hash

Returns **Buffer** JSON formatted string "null" on error.

# onAuthTx

[lib/handlers.js:347-368](https://github.com/animist-io/whale-island/blob/87111f2b1e79a30f45af7e2e6726a9d780f1f032/lib/handlers.js#L347-L368 "Source code on GitHub")

Auths client by invoking their contract's "verifyPresence" method with the device account.

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 297E3B0A-F353-4531-9D44-3686CC8C4036
-   `Access` **Pin** 

Returns **Buffer** JSON formatted string auth transaction hash.

Returns **Buffer** JSON formatted string "null" on error.

# onCallTx

[lib/handlers.js:294-307](https://github.com/animist-io/whale-island/blob/87111f2b1e79a30f45af7e2e6726a9d780f1f032/lib/handlers.js#L294-L307 "Source code on GitHub")

Executes web3.eth.call on methods that use no gas and do not need to be signed. This method is useful 
if you wish to retrieve data 'synchronously' from a contract using one of its constant public methods.

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

[lib/handlers.js:130-145](https://github.com/animist-io/whale-island/blob/87111f2b1e79a30f45af7e2e6726a9d780f1f032/lib/handlers.js#L130-L145 "Source code on GitHub")

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

[lib/handlers.js:50-53](https://github.com/animist-io/whale-island/blob/87111f2b1e79a30f45af7e2e6726a9d780f1f032/lib/handlers.js#L50-L53 "Source code on GitHub")

Publishes current blockNumber.

**Parameters**

-   `offset`  
-   `callback`  Hex code 0x00 on success

**Properties**

-   `Read` **Characteristic** C888866C-3499-4B80-B145-E1A61620F885
-   `Access` **Public** 

Returns **Buffer** JSON formatted string: "152..2"

# onGetContract

[lib/handlers.js:230-254](https://github.com/animist-io/whale-island/blob/87111f2b1e79a30f45af7e2e6726a9d780f1f032/lib/handlers.js#L230-L254 "Source code on GitHub")

Begins sending contract code plus a session id / expiration out to the client in a series of packets. 
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

[lib/handlers.js:263-282](https://github.com/animist-io/whale-island/blob/87111f2b1e79a30f45af7e2e6726a9d780f1f032/lib/handlers.js#L263-L282 "Source code on GitHub")

DeQueues and sends contract code packet.

**Properties**

-   `Access` **Automatic** following onGetContract call

Returns **Buffer** data: queued packet of JSON formatted contract object. (see onGetContract)

Returns **Buffer** JSON formatted string "EOF" after last packet is sent.

# onGetDeviceAccount

[lib/handlers.js:37-40](https://github.com/animist-io/whale-island/blob/87111f2b1e79a30f45af7e2e6726a9d780f1f032/lib/handlers.js#L37-L40 "Source code on GitHub")

Publishes endpoints public account number.

**Parameters**

-   `offset`  
-   `callback`  Hex code 0x00 on success

**Properties**

-   `Read` **Characteristic** 1FD26CCA-EA2B-4B9E-A59E-17AA7E61A0AC
-   `Access` **Public** 

Returns **Buffer** JSON formatted hex prefixed account address

# onGetNewSessionId

[lib/handlers.js:98-118](https://github.com/animist-io/whale-island/blob/87111f2b1e79a30f45af7e2e6726a9d780f1f032/lib/handlers.js#L98-L118 "Source code on GitHub")

Generates, saves and sends a new session id.

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 9BBA5055-57CA-4F78-BA61-52F4154382CF
-   `Access` **Pin** 

Returns **Buffer** JSON formatted object { sessionId: "a34..4q', expires: '435...01', account: '0x78ef..a' }

Returns **Buffer** JSON formatted string "null" on error.

# onGetPin

[lib/handlers.js:24-27](https://github.com/animist-io/whale-island/blob/87111f2b1e79a30f45af7e2e6726a9d780f1f032/lib/handlers.js#L24-L27 "Source code on GitHub")

Publishes current time pin value.

**Parameters**

-   `offset`  
-   `callback`  Hex code 0x00 on success

**Properties**

-   `Read` **Characteristic** C40C94B3-D9FF-45A0-9A37-032D72E423A9
-   `Access` **Public** 

Returns **Buffer** JSON formatted 32 character alpha-numeric string (resets every ~30 sec)

# onGetPresenceReceipt

[lib/handlers.js:162-178](https://github.com/animist-io/whale-island/blob/87111f2b1e79a30f45af7e2e6726a9d780f1f032/lib/handlers.js#L162-L178 "Source code on GitHub")

Responds with data that can be used to authenticate clients presence at the
endpoint. Consists of a timestamp, and both the timestamp signed and the caller's address
signed by the endpoint's account (using web3.sign). This method is useful
if you do not wish to embed presence verification within contract code and
are running a server that can independently validate this data.

**Parameters**

-   `data` **Buffer** : JSON formatted hex prefixed account address
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** BA2C3091-DAB8-4D51-BF92-3A6F023E9AD7
-   `Access` **Pin** 

Returns **Buffer** JSON formatted object: {time: '1453...9', signedTime: '0xaf..9e', signedAddress: '0x32...ae'}

Returns **Buffer** JSON formatted object: {} (Empty) on error.

# onGetTxStatus

[lib/handlers.js:67-86](https://github.com/animist-io/whale-island/blob/87111f2b1e79a30f45af7e2e6726a9d780f1f032/lib/handlers.js#L67-L86 "Source code on GitHub")

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

Returns **Buffer** JSON formatted string "null" on error.

# onGetVerifiedTxHash

[lib/handlers.js:192-217](https://github.com/animist-io/whale-island/blob/87111f2b1e79a30f45af7e2e6726a9d780f1f032/lib/handlers.js#L192-L217 "Source code on GitHub")

Sends the hash of a transaction sent in an atomic authAndSend request. Tx hash is available once 
the AuthTx has been mined and caller's transaction has been published to chain. Also returns authStatus 
data which may be 'pending' or 'failed' if authTx is unmined or ran out of gas.

**Parameters**

-   `data` **Buffer** : JSON formatted pin value, signed by caller account.
-   `offset`  
-   `response`  
-   `callback` **Buffer** : initial response is hex code . 0x00 on success or err.

**Properties**

-   `Subscribe` **Characteristic** 421522D1-C7EE-494C-A1E4-029BBE644E8D
-   `Access` **Pin** 

Returns **Buffer** JSON formatted string txhash: "0x7d34e..023"

Returns **Buffer** JSON formatted string "null" on error.

# onSendTx

[lib/handlers.js:321-335](https://github.com/animist-io/whale-island/blob/87111f2b1e79a30f45af7e2e6726a9d780f1f032/lib/handlers.js#L321-L335 "Source code on GitHub")

Sends tx as rawTransaction if tx signer's sessionId is valid. Will not submit if
a pending authAndSubmit tx exists in the contractDB for this caller account. 
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
