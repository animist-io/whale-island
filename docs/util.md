# activateQueue

[lib/util.js:156-156](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/util.js#L156-L156 "Source code on GitHub")

Sets flag to begin multi-packet message send

# canSendTx

[lib/util.js:374-391](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/util.js#L374-L391 "Source code on GitHub")

Verifies that pin signer and tx signer are same client, rejects
tx submissions for clients who while an atomic AuthAndSend is in progress.

**Parameters**

-   `client` **String** : callers address
-   `tx` **String** : signed transaction

Returns **Promise** Resolves w/ {ok: true, val: string signedTx }

Returns **Promise** Rejects w/  {ok: false, val: hex error code }

# deactivateQueue

[lib/util.js:162-162](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/util.js#L162-L162 "Source code on GitHub")

Unset multi-packet message send flag

# decrypt

[lib/util.js:60-71](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/util.js#L60-L71 "Source code on GitHub")

Decrypts encrypted PGP message

**Parameters**

-   `encrypted` **String** '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'

Returns **Promise** Resolves a decrypted message or rejects.

# deQueue

[lib/util.js:143-143](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/util.js#L143-L143 "Source code on GitHub")

DeQueues a packet from the send queue. This data structure is used to transmit long 
messages like contract code which exceed that maximum msg length for BLE

Returns **Buffer** packet: Part of a queued messsage.

# encrypt

[lib/util.js:79-92](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/util.js#L79-L92 "Source code on GitHub")

Encrypts a plaintext message with whale-island's public key. (For Unit Testing decryption)

**Parameters**

-   `data` **String** plain text
-   `publicKey` **String** '-----BEGIN PGP PUBLIC KEY BLOCK ... END PGP PUBLIC KEY BLOCK-----'

Returns **Promise** Resolve an encrypted string or rejects.

# extractPinFromJSON

[lib/util.js:209-228](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/util.js#L209-L228 "Source code on GitHub")

Retrieves pin from incoming data as string or eth-lightwallet object.

**Parameters**

-   `data` **String** : JSON formatted string or object

Returns **String or Object** signedPin: returns null on error.

# getPin

[lib/util.js:107-125](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/util.js#L107-L125 "Source code on GitHub")

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

[lib/util.js:168-168](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/util.js#L168-L168 "Source code on GitHub")

Get queue state, boolean active OR inactive.

Returns **Boolean** state

# parseAddress

[lib/util.js:349-362](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/util.js#L349-L362 "Source code on GitHub")

Parses call data string into object that can be given as param to web3.eth.call

**Parameters**

-   `data` **String** : JSON formatted string account address (must be hex prefixed)

Returns **Object** { ok: true, val: '0xabc3..567' }

Returns **Object** { ok: false, val: 0x05 } on error

# parseCall

[lib/util.js:326-340](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/util.js#L326-L340 "Source code on GitHub")

Parses call data string into object that can be given as param to web3.eth.call

**Parameters**

-   `data` **String** : JSON formatted string repr. array (len 2) of hex prefixed strings.

Returns **Object** { ok: true, val: {to: '0xee9..f', data: '0x34d..a'}

Returns **Object** { ok: false, val: 0x11 } on error

# parseSignedPin

[lib/util.js:236-260](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/util.js#L236-L260 "Source code on GitHub")

Validates format of signedPin (A check done before extracting address from it).

**Parameters**

-   `data` **String** : JSON formatted signed string OR an object with v,r,s fields.

Returns **Object** parsed:  { ok: boolean status, val: signed pin OR hex error code }

# parseSignedTx

[lib/util.js:270-298](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/util.js#L270-L298 "Source code on GitHub")

Checks that signed tx object is valid - i.e. that it was signed by the same sender
that signed the pin, that the signature verifies and tx's gas limit is sufficient.

**Parameters**

-   `data` **String** : JSON formatted signed transaction object
-   `client` **String** : hex prefixed address extracted from pin signing

Returns **Object** parsed: {ok: boolean status, val: tx string or error code }

# parseTxHash

[lib/util.js:305-316](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/util.js#L305-L316 "Source code on GitHub")

Verifies that JSON input has minimum formal properties of tx hash and returns hash as string.

**Parameters**

-   `data`  

Returns **Object** parsed: { ok: boolean status, val: txHash string OR hex error code  }

# queueActive

[lib/util.js:40-40](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/util.js#L40-L40 "Source code on GitHub")

# queueContract

[lib/util.js:176-199](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/util.js#L176-L199 "Source code on GitHub")

Converts a tx object into an array of buffers whose largest size is MAX_SEND 

-   e.g. the maximum number of bytes that can be sent in a packet.

**Parameters**

-   `code` **Object** :
-   `tx`  

# queueLength

[lib/util.js:150-150](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/util.js#L150-L150 "Source code on GitHub")

Gets number of packets remaining to send.

Returns **Number** length

# resetPin

[lib/util.js:131-134](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/util.js#L131-L134 "Source code on GitHub")

Generates a new pin. Keeps track of old pin until next reset.
