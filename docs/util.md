# activateQueue

[lib/util.js:163-163](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L163-L163 "Source code on GitHub")

Sets flag to begin multi-packet message send

# canSendTx

[lib/util.js:445-481](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L445-L481 "Source code on GitHub")

Validates sessionId, guarantees that sessionId was issued to tx signer, rejects
tx submissions for clients who while an atomic AuthAndSend is in progress.

**Parameters**

-   `data` **String** : JSON formatted {id: string ID, tx: string signedTx }

Returns **Promise** Resolves w/ {ok: true, val: string signedTx }

Returns **Promise** Rejects w/  {ok: false, val: hex error code }

# deactivateQueue

[lib/util.js:169-169](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L169-L169 "Source code on GitHub")

Unset multi-packet message send flag

# decrypt

[lib/util.js:67-78](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L67-L78 "Source code on GitHub")

Decrypts encrypted PGP message

**Parameters**

-   `encrypted` **String** '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'

Returns **Promise** Resolves a decrypted message or rejects.

# deQueue

[lib/util.js:150-150](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L150-L150 "Source code on GitHub")

DeQueues a packet from the send queue. This data structure is used to transmit long 
messages like contract code which exceed that maximum msg length for BLE

Returns **Buffer** packet: Part of a queued messsage.

# encrypt

[lib/util.js:86-99](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L86-L99 "Source code on GitHub")

Encrypts a plaintext message with whale-island's public key. (For Unit Testing decryption)

**Parameters**

-   `data` **String** plain text
-   `publicKey` **String** '-----BEGIN PGP PUBLIC KEY BLOCK ... END PGP PUBLIC KEY BLOCK-----'

Returns **Promise** Resolve an encrypted string or rejects.

# extractPinFromJSON

[lib/util.js:216-235](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L216-L235 "Source code on GitHub")

Retrieves pin from incoming data as string or eth-lightwallet object.

**Parameters**

-   `data` **String** : JSON formatted string or object

Returns **String or Object** signedPin: returns null on error.

# getPin

[lib/util.js:114-132](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L114-L132 "Source code on GitHub")

PIN getter. Blockchain writes and presence verifications require the mobile client to
sign this value w/the account they're executing txs with. Pin is generated anew for 
each connection and all endpoints except this one automatically disconnect from the client
at the earliest opportunity. After getting the pin mobile clients must make another endpoint
call within config.PIN_RESET_INTERVAL or their session will timeout. 
The pin helps to mitigate risks from MITM attack vectors and provides a way for clients to prove 
their identity.

**Parameters**

-   `generateNew` **Boolean** If true, generates a new pin and sets a timeout to clear it.

Returns **String** pin: A 32 character alpha-numeric _random_ value.

# isQueueActive

[lib/util.js:175-175](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L175-L175 "Source code on GitHub")

Get queue state, boolean active OR inactive.

Returns **Boolean** state

# isValidSession

[lib/util.js:425-436](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L425-L436 "Source code on GitHub")

Verifies session id still exists and was issued to caller.

**Parameters**

-   `id`  
-   `tx`  

Returns **Promise** Resolves if id is ok.

Returns **Promise** Rejects otherwise.

# parseAddress

[lib/util.js:378-391](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L378-L391 "Source code on GitHub")

Parses call data string into object that can be given as param to web3.eth.call

**Parameters**

-   `data` **String** : JSON formatted string account address (must be hex prefixed)

Returns **Object** { ok: true, val: '0xabc3..567' }

Returns **Object** { ok: false, val: 0x05 } on error

# parseCall

[lib/util.js:355-369](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L355-L369 "Source code on GitHub")

Parses call data string into object that can be given as param to web3.eth.call

**Parameters**

-   `data` **String** : JSON formatted string repr. array (len 2) of hex prefixed strings.

Returns **Object** { ok: true, val: {to: '0xee9..f', data: '0x34d..a'}

Returns **Object** { ok: false, val: 0x11 } on error

# parseSessionId

[lib/util.js:335-346](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L335-L346 "Source code on GitHub")

Verifies that JSON input has minimum formal properties of a sessionId and returns id as string.

**Parameters**

-   `data` **object** : JSON formatted object {id: sessionId string, tx: signedTx string }

Returns **object** parsed: {ok: boolean status, val: sessionId string OR hex error code}

# parseSignedPin

[lib/util.js:243-267](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L243-L267 "Source code on GitHub")

Validates format of signedPin (A check done before extracting address from it).

**Parameters**

-   `data` **String** : JSON formatted signed string OR an object with v,r,s fields.

Returns **Object** parsed:  { ok: boolean status, val: signed pin OR hex error code }

# parseSignedTx

[lib/util.js:277-309](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L277-L309 "Source code on GitHub")

Checks that signed tx object is valid - i.e. that it was signed by the same sender
that signed the pin, that the signature verifies and tx's gas limit is sufficient.

**Parameters**

-   `data` **String** : JSON formatted signed transaction object
-   `client` **String** : hex prefixed address extracted from pin signing

Returns **Object** parsed: {ok: boolean status, val: tx string or error code }

# parseTxHash

[lib/util.js:316-327](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L316-L327 "Source code on GitHub")

Verifies that JSON input has minimum formal properties of tx hash and returns hash as string.

**Parameters**

-   `data`  

Returns **Object** parsed: { ok: boolean status, val: txHash string OR hex error code  }

# queueActive

[lib/util.js:47-47](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L47-L47 "Source code on GitHub")

# queueContract

[lib/util.js:183-206](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L183-L206 "Source code on GitHub")

Converts a tx object into an array of buffers whose largest size is MAX_SEND 

-   e.g. the maximum number of bytes that can be sent in a packet.

**Parameters**

-   `code` **Object** :
-   `tx`  

# queueLength

[lib/util.js:157-157](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L157-L157 "Source code on GitHub")

Gets number of packets remaining to send.

Returns **Number** length

# resetPin

[lib/util.js:138-141](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L138-L141 "Source code on GitHub")

Generates a new pin. Keeps track of old pin until next reset.

# startSession

[lib/util.js:403-417](https://github.com/animist-io/whale-island/blob/fdb6391ea3f14cbca997614d07b93faeb24c2f3a/lib/util.js#L403-L417 "Source code on GitHub")

Generates & saves session id record. Session id is required to Send an arbitrary tx
and is used to prevent clients from publishing txs that need endpoint auth non-atomically.
Session gets deleted after config.SESSION_LENGTH.

**Parameters**

-   `tx` **Object** : Should contain at least an "account" field. May be a contract event object.

Returns **Promise** tx object updates w/ fields, sessionId: string, expires: int, account: string

Returns **Promise** hex error code
