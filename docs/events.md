# addPresenceVerificationRequest

[lib/events.js:135-141](https://github.com/animist-io/whale-island/blob/917dccb5a756218de7ddbd596cfc72bbc286308c/lib/events.js#L135-L141 "Source code on GitHub")

Adds a presenceVerification request to the animistEvents db. Does not allow duplicate clients.

**Parameters**

-   `event` **Object** `{account: <address>, contractAddress: <address>}`

# generateBeaconSignature

[lib/events.js:161-177](https://github.com/animist-io/whale-island/blob/917dccb5a756218de7ddbd596cfc72bbc286308c/lib/events.js#L161-L177 "Source code on GitHub")

Combines requested beacon uuid and randomly generated major and minor
values into a string with form: `<uuid>:<major>:<minor>`. 
Signs this with the node account and formats it for 
client's `submitSignedBeaconId` Solidity contract method

**Parameters**

-   `uuid` **String** v4 uuid
-   `major` **Number** Integer btw 0 and 65535
-   `minor` **Number** Integer btw 0 and 65535

Returns **Object** EC sig obj that Solidity will parse correctly

# generateRandom2ByteInt

[lib/events.js:147-149](https://github.com/animist-io/whale-island/blob/917dccb5a756218de7ddbd596cfc72bbc286308c/lib/events.js#L147-L149 "Source code on GitHub")

Generates a random value within the limits of allowed major and minor beacon values

Returns **Number** a value between 0 and 65535 inclusive

# getLastSavedBlock

[lib/events.js:109-114](https://github.com/animist-io/whale-island/blob/917dccb5a756218de7ddbd596cfc72bbc286308c/lib/events.js#L109-L114 "Source code on GitHub")

Retrieves last block for which an event was logged. This allows whale-island to synch its 
events db to blockchain if it's been turned off without filtering for every event since
the node's genesis block

**Parameters**

-   `db` **Object** Event DB

Returns **Number** Block number

Returns **Promise** Result of db.get OR device genesis block if DB is new.

# isValidExpirationDate

[lib/events.js:56-65](https://github.com/animist-io/whale-island/blob/917dccb5a756218de7ddbd596cfc72bbc286308c/lib/events.js#L56-L65 "Source code on GitHub")

Validates `expires` arg of a message publication event log. Duration must at least 1 sec and 
smaller than the max value of uint32. Returns false if `expires` is before `Date.now()`.

**Parameters**

-   `expires` **BigNumber** date (ms since Epoch) that broadcast should end.

Returns **Boolean** true if duration valid, false otherwise.

# isValidMessage

[lib/events.js:73-75](https://github.com/animist-io/whale-island/blob/917dccb5a756218de7ddbd596cfc72bbc286308c/lib/events.js#L73-L75 "Source code on GitHub")

Validates message arg of a message publication event log. Message must be non-null and
less than or equal to `config.MAX_MESSAGE_LENGTH`

**Parameters**

-   `message` **String** 

Returns **Boolean** true if message is valid, false otherwise.

# isValidMessagePublicationEvent

[lib/events.js:83-88](https://github.com/animist-io/whale-island/blob/917dccb5a756218de7ddbd596cfc72bbc286308c/lib/events.js#L83-L88 "Source code on GitHub")

Validates message publication event data.

**Parameters**

-   `event` **Object** `{ uuid: <uuid string>, message: <string>, expires: <date in ms> }`

Returns **Boolean** true if data validates, false otherwise.

# isValidPresenceVerificationEvent

[lib/events.js:95-99](https://github.com/animist-io/whale-island/blob/917dccb5a756218de7ddbd596cfc72bbc286308c/lib/events.js#L95-L99 "Source code on GitHub")

Validates presence verification request event data

**Parameters**

-   `event` **Objects** `{ account: <address>, contract: <address>}` }

Returns **Boolean** True if data validates, false otherwise.

# saveBlock

[lib/events.js:123-129](https://github.com/animist-io/whale-island/blob/917dccb5a756218de7ddbd596cfc72bbc286308c/lib/events.js#L123-L129 "Source code on GitHub")

Saves blocknumber of most recently logged event. This value serves as a starting point for the 
events logs filters run by the `start. . .EventFilter` methods

**Parameters**

-   `db` **Object** Event DB
-   `block` **Number** Current block number

# startBeaconBroadcastRequestsFilter

[lib/events.js:259-292](https://github.com/animist-io/whale-island/blob/917dccb5a756218de7ddbd596cfc72bbc286308c/lib/events.js#L259-L292 "Source code on GitHub")

Starts filtering for beacon broadcast request events. Validates event data and invokes `server`'s 
`addPublication` method for each event.

**Parameters**

-   `eventsContractAddress` **String** Address of the deployed AnimistEvents contract
-   `addBeacon` **Function** Callback to pass event data to so beacon can cast it.
-   `cb` **Function** (Optional) Callback to execute when an event is logged.

# startMessagePublicationRequestsFilter

[lib/events.js:226-248](https://github.com/animist-io/whale-island/blob/917dccb5a756218de7ddbd596cfc72bbc286308c/lib/events.js#L226-L248 "Source code on GitHub")

Starts filtering for message publication request events. Validates event data and invokes 
`server`'s addPublication method for each event.

**Parameters**

-   `eventsContractAddress` **String** Address of the deployed AnimistEvents contract
-   `successCb` **Function** Success callback to pass event data to so server can cast it.
-   `errorCb` **Function** (Optional) Callback to execute when an event is logged.

# startPresenceVerificationRequestsFilter

[lib/events.js:188-215](https://github.com/animist-io/whale-island/blob/917dccb5a756218de7ddbd596cfc72bbc286308c/lib/events.js#L188-L215 "Source code on GitHub")

Starts filtering for presence verfication request events, from proximityEvents DB's 
`lastBlock` to 'latest'. Validates event data, saves it and updates 'lastBlock' value to the 
event's blockNumber.

**Parameters**

-   `eventsContractAddress` **String** Address of the deployed AnimistEvents contract
-   `cb` **Function** (Optional) Callback to execute when an event is logged and saved in the DB
