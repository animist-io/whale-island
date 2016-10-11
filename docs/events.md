# addBroadcast

[lib/events.js:163-189](https://github.com/animist-io/whale-island/blob/daa2cbebf7479db7592ab3a0d8e6b1d67fe512e0/lib/events.js#L163-L189 "Source code on GitHub")

Updates the set of read characteristics to include a `channel` which responds with `content`
and disconnects. Sets a timeout to remove characteristic after `duration.

**Parameters**

-   `channel` **String** Characteristic UUID
-   `content` **String** Arbitrary 20byte string.
-   `duration` **Number** (Optional) Number of ms to broadcast signal for.

# addProximityEvent

[lib/events.js:148-154](https://github.com/animist-io/whale-island/blob/daa2cbebf7479db7592ab3a0d8e6b1d67fe512e0/lib/events.js#L148-L154 "Source code on GitHub")

Adds record to the proximityEvent database of an account address to verify the proximity of and
the address of the contract requesting this service: 
`{_id: <Account address>, contractAddress: <Contract address>}`

**Parameters**

-   `event` **Object** `{account: <address>, contractAddress: <address>}`

# changeBroadcast

[lib/events.js:204-223](https://github.com/animist-io/whale-island/blob/daa2cbebf7479db7592ab3a0d8e6b1d67fe512e0/lib/events.js#L204-L223 "Source code on GitHub")

Updates broadcast to reflect current set of `characteristics`.

# getLastSavedBlock

[lib/events.js:120-125](https://github.com/animist-io/whale-island/blob/daa2cbebf7479db7592ab3a0d8e6b1d67fe512e0/lib/events.js#L120-L125 "Source code on GitHub")

Retrieves last block for which a event was saved. This allows whale-island to synch its 
events db to blockchain if it's been turned off without filtering for every event since
the genesis block

**Parameters**

-   `db` **Object** Event DB (proximityEvents OR broadcastEvents)

Returns **Number** Block number

# isValidBroadcastEvent

[lib/events.js:97-101](https://github.com/animist-io/whale-island/blob/daa2cbebf7479db7592ab3a0d8e6b1d67fe512e0/lib/events.js#L97-L101 "Source code on GitHub")

Validates broadcast event topics

**Parameters**

-   `event` **Object** `{ channel: <uuid string>, content: <bytes>, duration: <number of ms>` }

Returns **Boolean** True if topics validate, false otherwise.

# isValidContent

[lib/events.js:79-90](https://github.com/animist-io/whale-island/blob/daa2cbebf7479db7592ab3a0d8e6b1d67fe512e0/lib/events.js#L79-L90 "Source code on GitHub")

Validates content topic of a broadcast event log.

**Parameters**

-   `content` **Bytes** ???

Returns **Boolean** True if content is valid, false otherwise.

# isValidDuration

[lib/events.js:72-72](https://github.com/animist-io/whale-island/blob/daa2cbebf7479db7592ab3a0d8e6b1d67fe512e0/lib/events.js#L72-L72 "Source code on GitHub")

STUB: Validates duration topic of a broadcast event log.

**Parameters**

-   `duration` **Number** milliseconds to broadcast for

Returns **Boolean** True if duration is valid, false otherwise.

# isValidProximityEvent

[lib/events.js:108-111](https://github.com/animist-io/whale-island/blob/daa2cbebf7479db7592ab3a0d8e6b1d67fe512e0/lib/events.js#L108-L111 "Source code on GitHub")

Validates proximity detection request event topics

**Parameters**

-   `event` **Objects** `{ account: <address>, contract: <address>}` }

Returns **Boolean** True if topics validate, false otherwise.

# removeBroadcast

[lib/events.js:195-198](https://github.com/animist-io/whale-island/blob/daa2cbebf7479db7592ab3a0d8e6b1d67fe512e0/lib/events.js#L195-L198 "Source code on GitHub")

Removes `channel` from current broadcast.

**Parameters**

-   `channel` **String** Characteristic UUID

# saveBlock

[lib/events.js:135-140](https://github.com/animist-io/whale-island/blob/daa2cbebf7479db7592ab3a0d8e6b1d67fe512e0/lib/events.js#L135-L140 "Source code on GitHub")

Saves blocknumber of a filtered event. This value serves as a starting point for the 
events filter in the start<type>EventFilter method

**Parameters**

-   `db` **Object** proximityEvents DB OR broadcastEvents DB
-   `block` **Number** Current block number

Returns **Object** Updated 'lastBlock' document

# startBroadcastContractFilter

[lib/events.js:263-285](https://github.com/animist-io/whale-island/blob/daa2cbebf7479db7592ab3a0d8e6b1d67fe512e0/lib/events.js#L263-L285 "Source code on GitHub")

Starts listening for broadcast request events on blockchain from broadcastEvents DB's 
`lastBlock` to 'latest'. Validates event data, changes the broadcast and updates 'lastBlock' 
value to the event's blockNumber.

**Parameters**

-   `cb` **Function** (Optional) Callback to execute when an event is logged and saved in the DB

# startProximityContractFilter

[lib/events.js:233-255](https://github.com/animist-io/whale-island/blob/daa2cbebf7479db7592ab3a0d8e6b1d67fe512e0/lib/events.js#L233-L255 "Source code on GitHub")

Starts listening for proximity detection request events on blockchain from proximityEvents DB's 
`lastBlock` to 'latest'. Validates event data, saves it and updates 'lastBlock' value to the 
event's blockNumber.

**Parameters**

-   `cb` **Function** (Optional) Callback to execute when an event is logged and saved in the DB
