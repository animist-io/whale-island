# activateQueue

[lib/util.js:181-181](https://github.com/animist-io/whale-island/blob/e7addeca31e0453ba80c85b9ef19f40df8088f39/lib/util.js#L181-L181 "Source code on GitHub")

Sets flag to begin multi-packet message send

# canSendTx

[lib/util.js:399-416](https://github.com/animist-io/whale-island/blob/e7addeca31e0453ba80c85b9ef19f40df8088f39/lib/util.js#L399-L416 "Source code on GitHub")

Checks that signed tx object is valid - i.e. that it was signed by the same sender
that signed the pin. Rejects tx submissions from clients who have a verifyPresenceAndSendTx 
request in progress.

**Parameters**

-   `client` **String** : callers address
-   `tx` **String** : signed transaction

Returns **Promise** Resolves w/ `{ok: true, val: <string signedTx> }`

Returns **Promise** Rejects w/  `{ok: false, val: <hex error code> }`

# deactivateQueue

[lib/util.js:187-187](https://github.com/animist-io/whale-island/blob/e7addeca31e0453ba80c85b9ef19f40df8088f39/lib/util.js#L187-L187 "Source code on GitHub")

Unsets multi-packet message send flag

# decrypt

[lib/util.js:60-71](https://github.com/animist-io/whale-island/blob/e7addeca31e0453ba80c85b9ef19f40df8088f39/lib/util.js#L60-L71 "Source code on GitHub")

Decrypts a PGP encrypted message

**Parameters**

-   `encrypted` **String** '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'

Returns **Promise** Resolves a decrypted message or rejects.

# deQueue

[lib/util.js:168-168](https://github.com/animist-io/whale-island/blob/e7addeca31e0453ba80c85b9ef19f40df8088f39/lib/util.js#L168-L168 "Source code on GitHub")

DeQueues a packet from the send queue. Used when transmitting  
messages like contract code which exceed the maximum msg length for BLE for
a given mobile platform.

Returns **Buffer** packet: Part of a queued messsage.

# encrypt

[lib/util.js:79-92](https://github.com/animist-io/whale-island/blob/e7addeca31e0453ba80c85b9ef19f40df8088f39/lib/util.js#L79-L92 "Source code on GitHub")

Encrypts a plaintext message with whale-island's public key. (for unit tests)

**Parameters**

-   `data` **String** plain text
-   `publicKey` **String** '-----BEGIN PGP PUBLIC KEY BLOCK ... END PGP PUBLIC KEY BLOCK-----'

Returns **Promise** Resolve an encrypted string or rejects.

# extractPinFromJSON

[lib/util.js:233-252](https://github.com/animist-io/whale-island/blob/e7addeca31e0453ba80c85b9ef19f40df8088f39/lib/util.js#L233-L252 "Source code on GitHub")

Retrieves pin from incoming data as string or eth-lightwallet object.

**Parameters**

-   `data` **String** : JSON formatted string or object

Returns **String or Object** signedPin: returns null on error.

# getPin

[lib/util.js:107-125](https://github.com/animist-io/whale-island/blob/e7addeca31e0453ba80c85b9ef19f40df8088f39/lib/util.js#L107-L125 "Source code on GitHub")

Gets pin. Blockchain writes and presence verifications require the mobile client to
sign this value w/the account they're executing txs with. Pin is generated anew for 
each connection and all endpoints except this one automatically disconnect from the client
at the earliest opportunity. After getting the pin mobile clients must make another endpoint
call within config.PIN_RESET_INTERVAL or their session will timeout. 
The pin helps to mitigate risks from MITM attack vectors and provides a way for clients to prove 
their identity.

**Parameters**

-   `generateNew` **Boolean** If true, generates a new pin and sets a timeout to clear it.

Returns **String** pin: A 32 character alpha-numeric _random_ value.

# getPinSafe

[lib/util.js:131-149](https://github.com/animist-io/whale-island/blob/e7addeca31e0453ba80c85b9ef19f40df8088f39/lib/util.js#L131-L149 "Source code on GitHub")

getPin that returns a fixed value - pending resolution of testrpc bug documented at 
`https://github.com/ethereumjs/testrpc/issues/190` (For unit testing).

**Parameters**

-   `generateNew`  

# isQueueActive

[lib/util.js:192-192](https://github.com/animist-io/whale-island/blob/e7addeca31e0453ba80c85b9ef19f40df8088f39/lib/util.js#L192-L192 "Source code on GitHub")

Gets queue state

Returns **Boolean** state active (`true`) OR inactive (`false`).

# parseAddress

[lib/util.js:373-386](https://github.com/animist-io/whale-island/blob/e7addeca31e0453ba80c85b9ef19f40df8088f39/lib/util.js#L373-L386 "Source code on GitHub")

Parses call data string into object that can be given as param to web3.eth.call

**Parameters**

-   `data` **String** : JSON formatted string account address (must be hex prefixed)

Returns **Object** `{ ok: true, val: '0xabc3..567' }`

Returns **Object** `{ ok: false, val: 0x05 }` on error

# parseCall

[lib/util.js:350-364](https://github.com/animist-io/whale-island/blob/e7addeca31e0453ba80c85b9ef19f40df8088f39/lib/util.js#L350-L364 "Source code on GitHub")

Parses call data string into object that can be given as param to web3.eth.call

**Parameters**

-   `data` **String** : JSON formatted string repr. array (len 2) of hex prefixed strings.

Returns **Object** `{ ok: true, val: {to: '0xee9..f', data: '0x34d..a'}`

Returns **Object** `{ ok: false, val: 0x11 }` on error

# parseSignedPin

[lib/util.js:260-284](https://github.com/animist-io/whale-island/blob/e7addeca31e0453ba80c85b9ef19f40df8088f39/lib/util.js#L260-L284 "Source code on GitHub")

Validates format of signedPin

**Parameters**

-   `data` **String** : JSON formatted signed string OR an object with v,r,s fields.

Returns **Object** parsed:  `{ ok: boolean status, val: signed pin OR hex error code }`

# parseSignedTx

[lib/util.js:294-322](https://github.com/animist-io/whale-island/blob/e7addeca31e0453ba80c85b9ef19f40df8088f39/lib/util.js#L294-L322 "Source code on GitHub")

Checks that signed tx object is valid - i.e. that it was signed by the same sender
that signed the pin, that the signature verifies and tx's gas limit is sufficient.

**Parameters**

-   `data` **String** : JSON formatted signed transaction object
-   `client` **String** : hex prefixed address extracted from pin signing

Returns **Object** parsed: `{ok: <boolean>, val: <tx string> or <hex error code> }`

# parseTxHash

[lib/util.js:329-340](https://github.com/animist-io/whale-island/blob/e7addeca31e0453ba80c85b9ef19f40df8088f39/lib/util.js#L329-L340 "Source code on GitHub")

Verifies that JSON input has minimum formal properties of tx hash and returns hash as string.

**Parameters**

-   `data`  

Returns **Object** parsed: `{ ok: <boolean>, val: <txHash string> OR <hex error code> }`

# queueActive

[lib/util.js:40-40](https://github.com/animist-io/whale-island/blob/e7addeca31e0453ba80c85b9ef19f40df8088f39/lib/util.js#L40-L40 "Source code on GitHub")

# queueContract

[lib/util.js:200-223](https://github.com/animist-io/whale-island/blob/e7addeca31e0453ba80c85b9ef19f40df8088f39/lib/util.js#L200-L223 "Source code on GitHub")

Converts a tx object into an array of buffers whose largest size is MAX_SEND 

-   e.g. the maximum number of bytes that can be sent in a packet.

**Parameters**

-   `code` **Object** :
-   `tx`  

# queueLength

[lib/util.js:175-175](https://github.com/animist-io/whale-island/blob/e7addeca31e0453ba80c85b9ef19f40df8088f39/lib/util.js#L175-L175 "Source code on GitHub")

Gets number of packets remaining to send.

Returns **Number** length

# resetPin

[lib/util.js:155-158](https://github.com/animist-io/whale-island/blob/e7addeca31e0453ba80c85b9ef19f40df8088f39/lib/util.js#L155-L158 "Source code on GitHub")

Generates a new pin. Keeps track of old pin until next reset.
