# addBroadcast

[lib/events.js:164-190](https://github.com/animist-io/whale-island/blob/83139db3d6f645073e5dddf8f1738add36454b81/lib/events.js#L164-L190 "Source code on GitHub")

Updates the set of read characteristics to include a `channel` which responds with `content`
and disconnects. Sets a timeout to remove characteristic after `duration.

**Parameters**

-   `channel` **String** Characteristic UUID
-   `content` **String** Arbitrary 20byte string.
-   `duration` **Number** (Optional) Number of ms to broadcast signal for.

# addProximityDetectionRequest

[lib/events.js:149-155](https://github.com/animist-io/whale-island/blob/83139db3d6f645073e5dddf8f1738add36454b81/lib/events.js#L149-L155 "Source code on GitHub")

Adds record to the proximityEvent database of an account address to verify the proximity of and
the address of the contract requesting this service: 
`{_id: <Account address>, contractAddress: <Contract address>}`

**Parameters**

-   `event` **Object** `{account: <address>, contractAddress: <address>}`

# changeBroadcast

[lib/events.js:205-224](https://github.com/animist-io/whale-island/blob/83139db3d6f645073e5dddf8f1738add36454b81/lib/events.js#L205-L224 "Source code on GitHub")

Updates broadcast to reflect current set of `characteristics`.

# getLastSavedBlock

[lib/events.js:122-127](https://github.com/animist-io/whale-island/blob/83139db3d6f645073e5dddf8f1738add36454b81/lib/events.js#L122-L127 "Source code on GitHub")

Retrieves last block for which a event was saved. This allows whale-island to synch its 
events db to blockchain if it's been turned off without filtering for every event since
the genesis block

**Parameters**

-   `db` **Object** Event DB (proximityEvents OR broadcastEvents)

Returns **Number** Block number

Returns **Promise** Result of db.upsert

# isValidBroadcastEvent

[lib/events.js:98-102](https://github.com/animist-io/whale-island/blob/83139db3d6f645073e5dddf8f1738add36454b81/lib/events.js#L98-L102 "Source code on GitHub")

Validates broadcast event topics

**Parameters**

-   `event` **Object** `{ channel: <uuid string>, content: <bytes>, duration: <number of ms>` }

Returns **Boolean** True if topics validate, false otherwise.

# isValidContent

[lib/events.js:80-91](https://github.com/animist-io/whale-island/blob/83139db3d6f645073e5dddf8f1738add36454b81/lib/events.js#L80-L91 "Source code on GitHub")

Validates content topic of a broadcast event log.

**Parameters**

-   `content` **Bytes** ???

Returns **Boolean** True if content is valid, false otherwise.

# isValidDuration

[lib/events.js:73-73](https://github.com/animist-io/whale-island/blob/83139db3d6f645073e5dddf8f1738add36454b81/lib/events.js#L73-L73 "Source code on GitHub")

STUB: Validates duration topic of a broadcast event log.

**Parameters**

-   `duration` **Number** milliseconds to broadcast for

Returns **Boolean** True if duration is valid, false otherwise.

# isValidProximityEvent

[lib/events.js:109-112](https://github.com/animist-io/whale-island/blob/83139db3d6f645073e5dddf8f1738add36454b81/lib/events.js#L109-L112 "Source code on GitHub")

Validates proximity detection request event topics

**Parameters**

-   `event` **Objects** `{ account: <address>, contract: <address>}` }

Returns **Boolean** True if topics validate, false otherwise.

# removeBroadcast

[lib/events.js:196-199](https://github.com/animist-io/whale-island/blob/83139db3d6f645073e5dddf8f1738add36454b81/lib/events.js#L196-L199 "Source code on GitHub")

Removes `channel` from current broadcast.

**Parameters**

-   `channel` **String** Characteristic UUID

# saveBlock

[lib/events.js:136-141](https://github.com/animist-io/whale-island/blob/83139db3d6f645073e5dddf8f1738add36454b81/lib/events.js#L136-L141 "Source code on GitHub")

Saves blocknumber of a filtered event. This value serves as a starting point for the 
events filter in the start<type>EventFilter method

**Parameters**

-   `db` **Object** proximityEvents DB OR broadcastEvents DB
-   `block` **Number** Current block number

# startBroadcastRequestsFilter

[lib/events.js:264-286](https://github.com/animist-io/whale-island/blob/83139db3d6f645073e5dddf8f1738add36454b81/lib/events.js#L264-L286 "Source code on GitHub")

Starts listening for broadcast request events on blockchain from broadcastEvents DB's 
`lastBlock` to 'latest'. Validates event data, changes the broadcast and updates 'lastBlock' 
value to the event's blockNumber.

**Parameters**

-   `cb` **Function** (Optional) Callback to execute when an event is logged and saved in the DB

# startProximityDetectionRequestsFilter

[lib/events.js:234-256](https://github.com/animist-io/whale-island/blob/83139db3d6f645073e5dddf8f1738add36454b81/lib/events.js#L234-L256 "Source code on GitHub")

Starts listening for proximity detection request events on blockchain from proximityEvents DB's 
`lastBlock` to 'latest'. Validates event data, saves it and updates 'lastBlock' value to the 
event's blockNumber.

**Parameters**

-   `cb` **Function** (Optional) Callback to execute when an event is logged and saved in the DB
