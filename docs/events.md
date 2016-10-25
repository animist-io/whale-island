# addPresenceVerificationRequest

[lib/events.js:137-143](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/events.js#L137-L143 "Source code on GitHub")

Adds account address to verify the presence of and the address of the contract requesting this service 
to the proximityEvents db. Will not allow duplicate clients.
`{_id: <Account address>, contractAddress: <Contract address>}`

**Parameters**

-   `event` **Object** `{account: <address>, contractAddress: <address>}`

# generateBeaconSignature

[lib/events.js:162-174](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/events.js#L162-L174 "Source code on GitHub")

Combines requested Beacon uuid and randomly generated major and minor
values into a string. Signs this with the nodeAccount and formats it correctly
for passage to client's submitSignedBeaconId method

**Parameters**

-   `uuid` **String** v4 uuid
-   `major` **Number** Integer btw 0 and 65535
-   `minor` **Number** Integer btw 0 and 65535

Returns **Object** EC sig obj that Solidity will parse correctly

# generateRandom2ByteInt

[lib/events.js:149-151](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/events.js#L149-L151 "Source code on GitHub")

Generates a random value within the limits of allowed major and minor beacon values

Returns **Number** Number between 0 and 65535 inclusive

# getLastSavedBlock

[lib/events.js:109-114](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/events.js#L109-L114 "Source code on GitHub")

Retrieves last block for which an event was logged. This allows whale-island to synch its 
events db to blockchain if it's been turned off without filtering for every event since
the device's genesis block

**Parameters**

-   `db` **Object** Event DB

Returns **Number** Block number

Returns **Promise** Result of db.get OR device genesis block if DB is new.

# isValidExpirationDate

[lib/events.js:56-65](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/events.js#L56-L65 "Source code on GitHub")

Validates `expires` arg of a message publication event log. Duration must at least 1 sec and 
smaller than the max value of uint32. If expires is before now, this test will return false.

**Parameters**

-   `expires` **BigNumber** date (ms since Epoch) that broadcast should end.

Returns **Boolean** True if duration valid, false otherwise.

# isValidMessage

[lib/events.js:73-75](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/events.js#L73-L75 "Source code on GitHub")

Validates message arg of a message publication event log. Message must be non-null and
less than or equal to config.MAX_MESSAGE_LENGTH

**Parameters**

-   `message` **String** 

Returns **Boolean** True if message is valid, false otherwise.

# isValidMessagePublicationEvent

[lib/events.js:83-88](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/events.js#L83-L88 "Source code on GitHub")

Validates message publication event data.

**Parameters**

-   `event` **Object** `{ uuid: <uuid string>, message: <string>, expires: <date in ms>` }

Returns **Boolean** True if data validates, false otherwise.

# isValidPresenceVerificationEvent

[lib/events.js:95-99](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/events.js#L95-L99 "Source code on GitHub")

Validates presence verification request event data

**Parameters**

-   `event` **Objects** `{ account: <address>, contract: <address>}` }

Returns **Boolean** True if data validates, false otherwise.

# saveBlock

[lib/events.js:123-129](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/events.js#L123-L129 "Source code on GitHub")

Saves blocknumber of most recently logged event. This value serves as a starting point for the 
events filter in the start...EventFilter methods

**Parameters**

-   `db` **Object** Event DB
-   `block` **Number** Current block number

# startBeaconBroadcastRequestsFilter

[lib/events.js:257-291](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/events.js#L257-L291 "Source code on GitHub")

Starts listening for beacon broadcast request events on blockchain. Validates event data and invokes `server`'s 
addPublication method for each event.

**Parameters**

-   `eventsContractAddress` **String** Address of the deployed AnimistEvents contract
-   `addBeacon` **Function** Callback to pass event data to so beacon can cast it.
-   `cb` **Function** (Optional) Callback to execute when an event is logged.

# startMessagePublicationRequestsFilter

[lib/events.js:223-246](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/events.js#L223-L246 "Source code on GitHub")

Starts listening for message publication request events on blockchain. Validates event data and invokes 
`server`'s addPublication method for each event.

**Parameters**

-   `eventsContractAddress` **String** Address of the deployed AnimistEvents contract
-   `addPublication` **Function** Callback to pass event data to so server can cast it.
-   `cb` **Function** (Optional) Callback to execute when an event is logged.

# startPresenceVerificationRequestsFilter

[lib/events.js:185-212](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/events.js#L185-L212 "Source code on GitHub")

Starts listening for presence verfication request events on blockchain from proximityEvents DB's 
`lastBlock` to 'latest'. Validates event data, saves it and updates 'lastBlock' value to the 
event's blockNumber.

**Parameters**

-   `eventsContractAddress` **String** Address of the deployed AnimistEvents contract
-   `cb` **Function** (Optional) Callback to execute when an event is logged and saved in the DB
