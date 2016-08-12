# onAuthAndSendTx

[lib/handlers.js:385-413](https://github.com/animist-io/whale-island/blob/4fa665cc628b63f1936c4fc37c1703b9ac1afc94/lib/handlers.js#L385-L413 "Source code on GitHub")

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

[lib/handlers.js:351-372](https://github.com/animist-io/whale-island/blob/4fa665cc628b63f1936c4fc37c1703b9ac1afc94/lib/handlers.js#L351-L372 "Source code on GitHub")

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

[lib/handlers.js:297-310](https://github.com/animist-io/whale-island/blob/4fa665cc628b63f1936c4fc37c1703b9ac1afc94/lib/handlers.js#L297-L310 "Source code on GitHub")

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

[lib/handlers.js:132-147](https://github.com/animist-io/whale-island/blob/4fa665cc628b63f1936c4fc37c1703b9ac1afc94/lib/handlers.js#L132-L147 "Source code on GitHub")

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

[lib/handlers.js:52-55](https://github.com/animist-io/whale-island/blob/4fa665cc628b63f1936c4fc37c1703b9ac1afc94/lib/handlers.js#L52-L55 "Source code on GitHub")

Publishes current blockNumber.

**Parameters**

-   `offset`  
-   `callback`  Hex code 0x00 on success

**Properties**

-   `Read` **Characteristic** C888866C-3499-4B80-B145-E1A61620F885
-   `Access` **Public** 

Returns **Buffer** JSON formatted string: "152..2"

# onGetContract

[lib/handlers.js:233-257](https://github.com/animist-io/whale-island/blob/4fa665cc628b63f1936c4fc37c1703b9ac1afc94/lib/handlers.js#L233-L257 "Source code on GitHub")

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

[lib/handlers.js:266-285](https://github.com/animist-io/whale-island/blob/4fa665cc628b63f1936c4fc37c1703b9ac1afc94/lib/handlers.js#L266-L285 "Source code on GitHub")

De-queues and sends contract code packet.

**Properties**

-   `Access` **Automatic** following onGetContract call

Returns **Buffer** data: queued packet of JSON formatted contract object. (see onGetContract)

Returns **Buffer** JSON formatted string "EOF" after last packet is sent.

# onGetDeviceAccount

[lib/handlers.js:39-42](https://github.com/animist-io/whale-island/blob/4fa665cc628b63f1936c4fc37c1703b9ac1afc94/lib/handlers.js#L39-L42 "Source code on GitHub")

Publishes animist node's public account number.

**Parameters**

-   `offset`  
-   `callback`  Hex code 0x00 on success

**Properties**

-   `Read` **Characteristic** 1FD26CCA-EA2B-4B9E-A59E-17AA7E61A0AC
-   `Access` **Public** 

Returns **Buffer** JSON formatted hex prefixed account address

# onGetNewSessionId

[lib/handlers.js:100-120](https://github.com/animist-io/whale-island/blob/4fa665cc628b63f1936c4fc37c1703b9ac1afc94/lib/handlers.js#L100-L120 "Source code on GitHub")

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

[lib/handlers.js:26-29](https://github.com/animist-io/whale-island/blob/4fa665cc628b63f1936c4fc37c1703b9ac1afc94/lib/handlers.js#L26-L29 "Source code on GitHub")

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

[lib/handlers.js:164-180](https://github.com/animist-io/whale-island/blob/4fa665cc628b63f1936c4fc37c1703b9ac1afc94/lib/handlers.js#L164-L180 "Source code on GitHub")

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

[lib/handlers.js:69-88](https://github.com/animist-io/whale-island/blob/4fa665cc628b63f1936c4fc37c1703b9ac1afc94/lib/handlers.js#L69-L88 "Source code on GitHub")

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

[lib/handlers.js:195-220](https://github.com/animist-io/whale-island/blob/4fa665cc628b63f1936c4fc37c1703b9ac1afc94/lib/handlers.js#L195-L220 "Source code on GitHub")

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

[lib/handlers.js:324-338](https://github.com/animist-io/whale-island/blob/4fa665cc628b63f1936c4fc37c1703b9ac1afc94/lib/handlers.js#L324-L338 "Source code on GitHub")

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
