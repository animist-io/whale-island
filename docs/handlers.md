# onCallTx

[lib/handlers.js:384-403](https://github.com/animist-io/whale-island/blob/14c2dc85df08f5ad1b2c55837074a93eee7edb6a/lib/handlers.js#L384-L403 "Source code on GitHub")

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

[lib/handlers.js:141-162](https://github.com/animist-io/whale-island/blob/14c2dc85df08f5ad1b2c55837074a93eee7edb6a/lib/handlers.js#L141-L162 "Source code on GitHub")

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

[lib/handlers.js:64-68](https://github.com/animist-io/whale-island/blob/14c2dc85df08f5ad1b2c55837074a93eee7edb6a/lib/handlers.js#L64-L68 "Source code on GitHub")

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

[lib/handlers.js:219-253](https://github.com/animist-io/whale-island/blob/14c2dc85df08f5ad1b2c55837074a93eee7edb6a/lib/handlers.js#L219-L253 "Source code on GitHub")

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

[lib/handlers.js:312-342](https://github.com/animist-io/whale-island/blob/14c2dc85df08f5ad1b2c55837074a93eee7edb6a/lib/handlers.js#L312-L342 "Source code on GitHub")

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

[lib/handlers.js:267-296](https://github.com/animist-io/whale-island/blob/14c2dc85df08f5ad1b2c55837074a93eee7edb6a/lib/handlers.js#L267-L296 "Source code on GitHub")

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

[lib/handlers.js:352-371](https://github.com/animist-io/whale-island/blob/14c2dc85df08f5ad1b2c55837074a93eee7edb6a/lib/handlers.js#L352-L371 "Source code on GitHub")

De-queues and sends contract code packet.

**Properties**

-   `Access` **Automatic** following onGetContract call
-   `Encrypted` **No** 

Returns **Buffer** data: queued packet of JSON formatted contract object. (see onGetContract)

Returns **Buffer** JSON formatted string "EOF" after last packet is sent.

# onGetDeviceAccount

[lib/handlers.js:49-53](https://github.com/animist-io/whale-island/blob/14c2dc85df08f5ad1b2c55837074a93eee7edb6a/lib/handlers.js#L49-L53 "Source code on GitHub")

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

[lib/handlers.js:79-83](https://github.com/animist-io/whale-island/blob/14c2dc85df08f5ad1b2c55837074a93eee7edb6a/lib/handlers.js#L79-L83 "Source code on GitHub")

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

[lib/handlers.js:35-38](https://github.com/animist-io/whale-island/blob/14c2dc85df08f5ad1b2c55837074a93eee7edb6a/lib/handlers.js#L35-L38 "Source code on GitHub")

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

[lib/handlers.js:179-201](https://github.com/animist-io/whale-island/blob/14c2dc85df08f5ad1b2c55837074a93eee7edb6a/lib/handlers.js#L179-L201 "Source code on GitHub")

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

[lib/handlers.js:99-128](https://github.com/animist-io/whale-island/blob/14c2dc85df08f5ad1b2c55837074a93eee7edb6a/lib/handlers.js#L99-L128 "Source code on GitHub")

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

[lib/handlers.js:417-459](https://github.com/animist-io/whale-island/blob/14c2dc85df08f5ad1b2c55837074a93eee7edb6a/lib/handlers.js#L417-L459 "Source code on GitHub")

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

[lib/handlers.js:473-510](https://github.com/animist-io/whale-island/blob/14c2dc85df08f5ad1b2c55837074a93eee7edb6a/lib/handlers.js#L473-L510 "Source code on GitHub")

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

[lib/handlers.js:524-566](https://github.com/animist-io/whale-island/blob/14c2dc85df08f5ad1b2c55837074a93eee7edb6a/lib/handlers.js#L524-L566 "Source code on GitHub")

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
