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
