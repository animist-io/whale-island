# activateQueue

[lib/util.js:81-81](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/util.js#L81-L81 "Source code on GitHub")

Sets flag to begin multi-packet message send

# canSendTx

[lib/util.js:335-371](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/util.js#L335-L371 "Source code on GitHub")

Validates sessionId, guarantees that sessionId was issued to tx signer, rejects
tx submissions for clients who while an atomic AuthAndSend is in progress.

**Parameters**

-   `data` **String** : JSON formatted {id: string ID, tx: string signedTx }

Returns **Promise** Resolves w/ {ok: true, val: string signedTx }

Returns **Promise** Rejects w/  {ok: false, val: hex error code }

# deactivateQueue

[lib/util.js:87-87](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/util.js#L87-L87 "Source code on GitHub")

Unset multi-packet message send flag

# deQueue

[lib/util.js:68-68](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/util.js#L68-L68 "Source code on GitHub")

DeQueues a packet from the send queue. This data structure is used to transmit long 
messages like contract code which exceed that maximum msg length for BLE

Returns **Buffer** packet: Part of a queued messsage.

# extractPinFromJSON

[lib/util.js:133-150](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/util.js#L133-L150 "Source code on GitHub")

Retrieves pin from incoming data as string or eth-lightwallet object.

**Parameters**

-   `data` **String** : JSON formatted string or object

Returns **String or Object** signedPin: returns null on error.

# getPin

[lib/util.js:50-50](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/util.js#L50-L50 "Source code on GitHub")

PIN getter. Writes/auths and sessions on the server require the mobile client to
sign this value w/the account they're executing txs with. The pin makes the endpoint 
slightly harder to spoof by requiring you read a value in real-time.

Returns **String** pin: A 32 character alpha-numeric random value.

# isQueueActive

[lib/util.js:93-93](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/util.js#L93-L93 "Source code on GitHub")

Get queue state, boolean active OR inactive.

Returns **Boolean** state

# isValidSession

[lib/util.js:315-326](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/util.js#L315-L326 "Source code on GitHub")

Verifies session id still exists and was issued to caller.

**Parameters**

-   `id`  
-   `tx`  

Returns **Promise** Resolves if id is ok.

Returns **Promise** Rejects otherwise.

# parseCall

[lib/util.js:267-281](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/util.js#L267-L281 "Source code on GitHub")

Parses call data string into object that can be given as param to web3.eth.call

**Parameters**

-   `data` **String** : JSON string repr. array (len 2) of hex prefixed strings.

Returns **Object** result: { ok: boolean status, val: {to: string, data: string} OR hex error code}

# parseSessionId

[lib/util.js:248-259](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/util.js#L248-L259 "Source code on GitHub")

Verifies that JSON input has minimum formal properties of a sessionId and returns id as string.

**Parameters**

-   `data` **object** : JSON formatted object {id: sessionId string, tx: signedTx string }

Returns **object** parsed: {ok: boolean status, val: sessionId string OR hex error code}

# parseSignedPin

[lib/util.js:158-180](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/util.js#L158-L180 "Source code on GitHub")

Validates format of signedPin (A check done before extracting address from it).

**Parameters**

-   `data` **String** : JSON formatted signed string OR an object with v,r,s fields.

Returns **Object** parsed:  { ok: boolean status, val: signed pin OR hex error code }

# parseSignedTx

[lib/util.js:190-222](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/util.js#L190-L222 "Source code on GitHub")

Checks that signed tx object is valid - i.e. that it was signed by the same sender
that signed the pin, that the signature verifies and tx's gas limit is sufficient.

**Parameters**

-   `data` **String** : JSON formatted signed transaction object
-   `client` **String** : hex prefixed address extracted from pin signing

Returns **Object** parsed: {ok: boolean status, val: tx string or error code }

# parseTxHash

[lib/util.js:229-240](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/util.js#L229-L240 "Source code on GitHub")

Verifies that JSON input has minimum formal properties of tx hash and returns hash as string.

**Parameters**

-   `data`  

Returns **Object** parsed: { ok: boolean status, val: txHash string OR hex error code  }

# queueActive

[lib/util.js:37-37](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/util.js#L37-L37 "Source code on GitHub")

# queueContract

[lib/util.js:101-124](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/util.js#L101-L124 "Source code on GitHub")

Converts a tx object into an array of buffers whose largest size is MAX_SEND 

-   e.g. the maximum number of bytes that can be sent in a packet.

**Parameters**

-   `code` **Object** :
-   `tx`  

# queueLength

[lib/util.js:75-75](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/util.js#L75-L75 "Source code on GitHub")

Gets number of packets remaining to send.

Returns **Number** length

# resetPin

[lib/util.js:56-59](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/util.js#L56-L59 "Source code on GitHub")

Generates a new pin. Keeps track of old pin until next reset.

# startSession

[lib/util.js:293-307](https://github.com/animist-io/whale-island/blob/44dcfd9ca9936b40a8719a4b52b4e01491cdd2cc/lib/util.js#L293-L307 "Source code on GitHub")

Generates & saves session id record. Session id is required to Send an arbitrary tx
and is used to prevent clients from publishing txs that need endpoint auth non-atomically.
Session gets deleted after config.SESSION_LENGTH.

**Parameters**

-   `tx` **Object** : Should contain at least an "account" field. May be a contract event object.

Returns **Promise** tx object updates w/ fields, sessionId: string, expires: int, account: string

Returns **Promise** hex error code