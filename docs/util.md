# activateQueue

[lib/util.js:159-159](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L159-L159 "Source code on GitHub")

Sets flag to begin multi-packet message send

# canSendTx

[lib/util.js:441-477](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L441-L477 "Source code on GitHub")

Validates sessionId, guarantees that sessionId was issued to tx signer, rejects
tx submissions for clients who while an atomic AuthAndSend is in progress.

**Parameters**

-   `data` **String** : JSON formatted {id: string ID, tx: string signedTx }

Returns **Promise** Resolves w/ {ok: true, val: string signedTx }

Returns **Promise** Rejects w/  {ok: false, val: hex error code }

# deactivateQueue

[lib/util.js:165-165](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L165-L165 "Source code on GitHub")

Unset multi-packet message send flag

# decrypt

[lib/util.js:67-78](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L67-L78 "Source code on GitHub")

Decrypts encrypted PGP message

**Parameters**

-   `encrypted` **String** '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'

Returns **Promise** Resolves a decrypted message or rejects.

# deQueue

[lib/util.js:146-146](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L146-L146 "Source code on GitHub")

DeQueues a packet from the send queue. This data structure is used to transmit long 
messages like contract code which exceed that maximum msg length for BLE

Returns **Buffer** packet: Part of a queued messsage.

# encrypt

[lib/util.js:86-99](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L86-L99 "Source code on GitHub")

Encrypts a plaintext message with whale-island's public key. (For Unit Testing decryption)

**Parameters**

-   `data` **String** plain text
-   `publicKey` **String** '-----BEGIN PGP PUBLIC KEY BLOCK ... END PGP PUBLIC KEY BLOCK-----'

Returns **Promise** Resolve an encrypted string or rejects.

# extractPinFromJSON

[lib/util.js:212-231](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L212-L231 "Source code on GitHub")

Retrieves pin from incoming data as string or eth-lightwallet object.

**Parameters**

-   `data` **String** : JSON formatted string or object

Returns **String or Object** signedPin: returns null on error.

# getPin

[lib/util.js:110-128](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L110-L128 "Source code on GitHub")

PIN getter. Writes/auths and sessions on the server require the mobile client to
sign this value w/the account they're executing txs with. The pin makes the endpoint 
slightly harder to spoof by requiring you read a value in real-time.

**Parameters**

-   `generateNew` **Boolean** If true, generates a new pin and sets a timeout to clear it.

Returns **String** pin: A 32 character alpha-numeric _random_ value.

# isQueueActive

[lib/util.js:171-171](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L171-L171 "Source code on GitHub")

Get queue state, boolean active OR inactive.

Returns **Boolean** state

# isValidSession

[lib/util.js:421-432](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L421-L432 "Source code on GitHub")

Verifies session id still exists and was issued to caller.

**Parameters**

-   `id`  
-   `tx`  

Returns **Promise** Resolves if id is ok.

Returns **Promise** Rejects otherwise.

# parseAddress

[lib/util.js:374-387](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L374-L387 "Source code on GitHub")

Parses call data string into object that can be given as param to web3.eth.call

**Parameters**

-   `data` **String** : JSON formatted string account address (must be hex prefixed)

Returns **Object** { ok: true, val: '0xabc3..567' }

Returns **Object** { ok: false, val: 0x05 } on error

# parseCall

[lib/util.js:351-365](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L351-L365 "Source code on GitHub")

Parses call data string into object that can be given as param to web3.eth.call

**Parameters**

-   `data` **String** : JSON formatted string repr. array (len 2) of hex prefixed strings.

Returns **Object** { ok: true, val: {to: '0xee9..f', data: '0x34d..a'}

Returns **Object** { ok: false, val: 0x11 } on error

# parseSessionId

[lib/util.js:331-342](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L331-L342 "Source code on GitHub")

Verifies that JSON input has minimum formal properties of a sessionId and returns id as string.

**Parameters**

-   `data` **object** : JSON formatted object {id: sessionId string, tx: signedTx string }

Returns **object** parsed: {ok: boolean status, val: sessionId string OR hex error code}

# parseSignedPin

[lib/util.js:239-263](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L239-L263 "Source code on GitHub")

Validates format of signedPin (A check done before extracting address from it).

**Parameters**

-   `data` **String** : JSON formatted signed string OR an object with v,r,s fields.

Returns **Object** parsed:  { ok: boolean status, val: signed pin OR hex error code }

# parseSignedTx

[lib/util.js:273-305](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L273-L305 "Source code on GitHub")

Checks that signed tx object is valid - i.e. that it was signed by the same sender
that signed the pin, that the signature verifies and tx's gas limit is sufficient.

**Parameters**

-   `data` **String** : JSON formatted signed transaction object
-   `client` **String** : hex prefixed address extracted from pin signing

Returns **Object** parsed: {ok: boolean status, val: tx string or error code }

# parseTxHash

[lib/util.js:312-323](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L312-L323 "Source code on GitHub")

Verifies that JSON input has minimum formal properties of tx hash and returns hash as string.

**Parameters**

-   `data`  

Returns **Object** parsed: { ok: boolean status, val: txHash string OR hex error code  }

# queueActive

[lib/util.js:47-47](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L47-L47 "Source code on GitHub")

# queueContract

[lib/util.js:179-202](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L179-L202 "Source code on GitHub")

Converts a tx object into an array of buffers whose largest size is MAX_SEND 

-   e.g. the maximum number of bytes that can be sent in a packet.

**Parameters**

-   `code` **Object** :
-   `tx`  

# queueLength

[lib/util.js:153-153](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L153-L153 "Source code on GitHub")

Gets number of packets remaining to send.

Returns **Number** length

# resetPin

[lib/util.js:134-137](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L134-L137 "Source code on GitHub")

Generates a new pin. Keeps track of old pin until next reset.

# startSession

[lib/util.js:399-413](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/util.js#L399-L413 "Source code on GitHub")

Generates & saves session id record. Session id is required to Send an arbitrary tx
and is used to prevent clients from publishing txs that need endpoint auth non-atomically.
Session gets deleted after config.SESSION_LENGTH.

**Parameters**

-   `tx` **Object** : Should contain at least an "account" field. May be a contract event object.

Returns **Promise** tx object updates w/ fields, sessionId: string, expires: int, account: string

Returns **Promise** hex error code
