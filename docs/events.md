# addPresenceVerificationRequest

[lib/events.js:161-167](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/events.js#L161-L167 "Source code on GitHub")

Adds account address to verify the presence of and the address of the contract requesting this service 
to the proximityEvents db. Will not allow duplicate clients.
`{_id: <Account address>, contractAddress: <Contract address>}`

**Parameters**

-   `event` **Object** `{account: <address>, contractAddress: <address>}`

# addPublication

[lib/events.js:175-204](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/events.js#L175-L204 "Source code on GitHub")

Updates the set of read characteristics to include a `uuid` which responds with `message`
and disconnects. Sets a timeout to remove characteristic after `duration`.

**Parameters**

-   `event` **Object** Eth log object with uuid, message and duration args.

Returns **Array** Array of objects - bleno characteristics - currently broadcast.

# changeBroadcast

[lib/events.js:220-239](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/events.js#L220-L239 "Source code on GitHub")

Updates broadcast to reflect current set of `characteristics`.

# getLastSavedBlock

[lib/events.js:133-138](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/events.js#L133-L138 "Source code on GitHub")

Retrieves last block for which an event was logged. This allows whale-island to synch its 
events db to blockchain if it's been turned off without filtering for every event since
the device's genesis block

**Parameters**

-   `db` **Object** Event DB

Returns **Number** Block number

Returns **Promise** Result of db.get OR device genesis block if DB is new.

# isValidDuration

[lib/events.js:72-76](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/events.js#L72-L76 "Source code on GitHub")

Validates duration arg of a message publication event log. Duration must at least 1 sec and 
smaller than the max value of uint32.

**Parameters**

-   `duration` **BigNumber** milliseconds to broadcast for

Returns **Boolean** True if duration valid, false otherwise.

# isValidMessage

[lib/events.js:84-86](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/events.js#L84-L86 "Source code on GitHub")

Validates message arg of a message publication event log. Message must be non-null and
less than or equal to config.MAX_MESSAGE_LENGTH

**Parameters**

-   `message` **String** 

Returns **Boolean** True if message is valid, false otherwise.

# isValidMessagePublicationEvent

[lib/events.js:106-111](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/events.js#L106-L111 "Source code on GitHub")

Validates message publication event data.

**Parameters**

-   `event` **Object** `{ uuid: <uuid string>, message: <string>, duration: <number of ms>` }

Returns **Boolean** True if data validates, false otherwise.

# isValidPresenceVerificationEvent

[lib/events.js:119-123](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/events.js#L119-L123 "Source code on GitHub")

Validates presence verification request event data

**Parameters**

-   `event` **Objects** `{ account: <address>, contract: <address>}` }

Returns **Boolean** True if data validates, false otherwise.

# isValidUUID

[lib/events.js:93-99](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/events.js#L93-L99 "Source code on GitHub")

Validates uuid string and verifies that this uuid is NOT already being published.

**Parameters**

-   `uuid` **String** [description]

Returns **Boolean** True if uuid is valid, false otherwise

# removePublication

[lib/events.js:210-214](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/events.js#L210-L214 "Source code on GitHub")

Removes `uui` from current broadcast.

**Parameters**

-   `uuid` **String** Characteristic UUID

# saveBlock

[lib/events.js:147-153](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/events.js#L147-L153 "Source code on GitHub")

Saves blocknumber of most recently logged event. This value serves as a starting point for the 
events filter in the start...EventFilter methods

**Parameters**

-   `db` **Object** Event DB
-   `block` **Number** Current block number

# startMessagePublicationRequestsFilter

[lib/events.js:281-298](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/events.js#L281-L298 "Source code on GitHub")

Starts listening for message publication request events on blockchain. Validates event data and changes the broadcast.

**Parameters**

-   `contractAddress`  
-   `startBlock`  
-   `cb` **Function** (Optional) Callback to execute when an event is logged.

# startPresenceVerificationRequestsFilter

[lib/events.js:249-275](https://github.com/animist-io/whale-island/blob/1e2c65d4871cb9e42acbb39e00f9199a734104e6/lib/events.js#L249-L275 "Source code on GitHub")

Starts listening for presence verfication request events on blockchain from proximityEvents DB's 
`lastBlock` to 'latest'. Validates event data, saves it and updates 'lastBlock' value to the 
event's blockNumber.

**Parameters**

-   `contractAddress`  
-   `cb` **Function** (Optional) Callback to execute when an event is logged and saved in the DB
