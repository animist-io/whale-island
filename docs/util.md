# activateQueue

[lib/util.js:156-156](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L156-L156 "Source code on GitHub")

Sets flag to begin multi-packet message send

# canSendTx

[lib/util.js:438-474](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L438-L474 "Source code on GitHub")

Validates sessionId, guarantees that sessionId was issued to tx signer, rejects
tx submissions for clients who while an atomic AuthAndSend is in progress.

**Parameters**

-   `data` **String** : JSON formatted {id: string ID, tx: string signedTx }

Returns **Promise** Resolves w/ {ok: true, val: string signedTx }

Returns **Promise** Rejects w/  {ok: false, val: hex error code }

# deactivateQueue

[lib/util.js:162-162](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L162-L162 "Source code on GitHub")

Unset multi-packet message send flag

# decrypt

[lib/util.js:64-75](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L64-L75 "Source code on GitHub")

Decrypts encrypted PGP message

**Parameters**

-   `encrypted` **String** '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'

Returns **Promise** Resolves a decrypted message or rejects.

# deQueue

[lib/util.js:143-143](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L143-L143 "Source code on GitHub")

DeQueues a packet from the send queue. This data structure is used to transmit long 
messages like contract code which exceed that maximum msg length for BLE

Returns **Buffer** packet: Part of a queued messsage.

# encrypt

[lib/util.js:83-96](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L83-L96 "Source code on GitHub")

Encrypts a plaintext message with whale-island's public key. (For Unit Testing decryption)

**Parameters**

-   `data` **String** plain text
-   `publicKey` **String** '-----BEGIN PGP PUBLIC KEY BLOCK ... END PGP PUBLIC KEY BLOCK-----'

Returns **Promise** Resolve an encrypted string or rejects.

# extractPinFromJSON

[lib/util.js:209-228](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L209-L228 "Source code on GitHub")

Retrieves pin from incoming data as string or eth-lightwallet object.

**Parameters**

-   `data` **String** : JSON formatted string or object

Returns **String or Object** signedPin: returns null on error.

# getPin

[lib/util.js:107-125](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L107-L125 "Source code on GitHub")

PIN getter. Writes/auths and sessions on the server require the mobile client to
sign this value w/the account they're executing txs with. The pin makes the endpoint 
slightly harder to spoof by requiring you read a value in real-time.

**Parameters**

-   `generateNew` **Boolean** If true, generates a new pin and sets a timeout to clear it.

Returns **String** pin: A 32 character alpha-numeric _random_ value.

# isQueueActive

[lib/util.js:168-168](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L168-L168 "Source code on GitHub")

Get queue state, boolean active OR inactive.

Returns **Boolean** state

# isValidSession

[lib/util.js:418-429](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L418-L429 "Source code on GitHub")

Verifies session id still exists and was issued to caller.

**Parameters**

-   `id`  
-   `tx`  

Returns **Promise** Resolves if id is ok.

Returns **Promise** Rejects otherwise.

# parseAddress

[lib/util.js:371-384](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L371-L384 "Source code on GitHub")

Parses call data string into object that can be given as param to web3.eth.call

**Parameters**

-   `data` **String** : JSON formatted string account address (must be hex prefixed)

Returns **Object** { ok: true, val: '0xabc3..567' }

Returns **Object** { ok: false, val: 0x05 } on error

# parseCall

[lib/util.js:348-362](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L348-L362 "Source code on GitHub")

Parses call data string into object that can be given as param to web3.eth.call

**Parameters**

-   `data` **String** : JSON formatted string repr. array (len 2) of hex prefixed strings.

Returns **Object** { ok: true, val: {to: '0xee9..f', data: '0x34d..a'}

Returns **Object** { ok: false, val: 0x11 } on error

# parseSessionId

[lib/util.js:328-339](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L328-L339 "Source code on GitHub")

Verifies that JSON input has minimum formal properties of a sessionId and returns id as string.

**Parameters**

-   `data` **object** : JSON formatted object {id: sessionId string, tx: signedTx string }

Returns **object** parsed: {ok: boolean status, val: sessionId string OR hex error code}

# parseSignedPin

[lib/util.js:236-260](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L236-L260 "Source code on GitHub")

Validates format of signedPin (A check done before extracting address from it).

**Parameters**

-   `data` **String** : JSON formatted signed string OR an object with v,r,s fields.

Returns **Object** parsed:  { ok: boolean status, val: signed pin OR hex error code }

# parseSignedTx

[lib/util.js:270-302](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L270-L302 "Source code on GitHub")

Checks that signed tx object is valid - i.e. that it was signed by the same sender
that signed the pin, that the signature verifies and tx's gas limit is sufficient.

**Parameters**

-   `data` **String** : JSON formatted signed transaction object
-   `client` **String** : hex prefixed address extracted from pin signing

Returns **Object** parsed: {ok: boolean status, val: tx string or error code }

# parseTxHash

[lib/util.js:309-320](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L309-L320 "Source code on GitHub")

Verifies that JSON input has minimum formal properties of tx hash and returns hash as string.

**Parameters**

-   `data`  

Returns **Object** parsed: { ok: boolean status, val: txHash string OR hex error code  }

# queueActive

[lib/util.js:44-44](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L44-L44 "Source code on GitHub")

# queueContract

[lib/util.js:176-199](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L176-L199 "Source code on GitHub")

Converts a tx object into an array of buffers whose largest size is MAX_SEND 

-   e.g. the maximum number of bytes that can be sent in a packet.

**Parameters**

-   `code` **Object** :
-   `tx`  

# queueLength

[lib/util.js:150-150](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L150-L150 "Source code on GitHub")

Gets number of packets remaining to send.

Returns **Number** length

# resetPin

[lib/util.js:131-134](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L131-L134 "Source code on GitHub")

Generates a new pin. Keeps track of old pin until next reset.

# startSession

[lib/util.js:396-410](https://github.com/animist-io/whale-island/blob/3f28d9495da84f887e359950dff4b9751c72d134/lib/util.js#L396-L410 "Source code on GitHub")

Generates & saves session id record. Session id is required to Send an arbitrary tx
and is used to prevent clients from publishing txs that need endpoint auth non-atomically.
Session gets deleted after config.SESSION_LENGTH.

**Parameters**

-   `tx` **Object** : Should contain at least an "account" field. May be a contract event object.

Returns **Promise** tx object updates w/ fields, sessionId: string, expires: int, account: string

Returns **Promise** hex error code
