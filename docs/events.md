# addPresenceVerificationRequest

[lib/events.js:130-136](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/events.js#L130-L136 "Source code on GitHub")

Adds account address to verify the presence of and the address of the contract requesting this service 
to the proximityEvents db. Will not allow duplicate clients.
`{_id: <Account address>, contractAddress: <Contract address>}`

**Parameters**

-   `event` **Object** `{account: <address>, contractAddress: <address>}`

# generateBeaconSignature

[lib/events.js:155-167](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/events.js#L155-L167 "Source code on GitHub")

Combines requested Beacon uuid and randomly generated major and minor
values into a string. Signs this with the nodeAccount and formats it correctly
for passage to client's submitSignedBeaconId method

**Parameters**

-   `uuid` **String** v4 uuid
-   `major` **Number** Integer btw 0 and 65535
-   `minor` **Number** Integer btw 0 and 65535

Returns **Object** EC sig obj that Solidity will parse correctly

# generateRandom2ByteInt

[lib/events.js:142-144](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/events.js#L142-L144 "Source code on GitHub")

Generates a random value within the limits of allowed major and minor beacon values

Returns **Number** Number between 0 and 65535 inclusive

# getLastSavedBlock

[lib/events.js:102-107](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/events.js#L102-L107 "Source code on GitHub")

Retrieves last block for which an event was logged. This allows whale-island to synch its 
events db to blockchain if it's been turned off without filtering for every event since
the device's genesis block

**Parameters**

-   `db` **Object** Event DB

Returns **Number** Block number

Returns **Promise** Result of db.get OR device genesis block if DB is new.

# isValidExpirationDate

[lib/events.js:54-58](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/events.js#L54-L58 "Source code on GitHub")

Validates `expires` arg of a message publication event log. Duration must at least 1 sec and 
smaller than the max value of uint32. If expires is before now, this test will return false.

**Parameters**

-   `expires` **BigNumber** date (ms since Epoch) that broadcast should end.

Returns **Boolean** True if duration valid, false otherwise.

# isValidMessage

[lib/events.js:66-68](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/events.js#L66-L68 "Source code on GitHub")

Validates message arg of a message publication event log. Message must be non-null and
less than or equal to config.MAX_MESSAGE_LENGTH

**Parameters**

-   `message` **String** 

Returns **Boolean** True if message is valid, false otherwise.

# isValidMessagePublicationEvent

[lib/events.js:76-81](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/events.js#L76-L81 "Source code on GitHub")

Validates message publication event data.

**Parameters**

-   `event` **Object** `{ uuid: <uuid string>, message: <string>, expires: <date in ms>` }

Returns **Boolean** True if data validates, false otherwise.

# isValidPresenceVerificationEvent

[lib/events.js:88-92](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/events.js#L88-L92 "Source code on GitHub")

Validates presence verification request event data

**Parameters**

-   `event` **Objects** `{ account: <address>, contract: <address>}` }

Returns **Boolean** True if data validates, false otherwise.

# saveBlock

[lib/events.js:116-122](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/events.js#L116-L122 "Source code on GitHub")

Saves blocknumber of most recently logged event. This value serves as a starting point for the 
events filter in the start...EventFilter methods

**Parameters**

-   `db` **Object** Event DB
-   `block` **Number** Current block number

# startBeaconBroadcastRequestsFilter

[lib/events.js:250-284](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/events.js#L250-L284 "Source code on GitHub")

Starts listening for beacon broadcast request events on blockchain. Validates event data and invokes `server`'s 
addPublication method for each event.

**Parameters**

-   `eventsContractAddress` **String** Address of the deployed AnimistEvents contract
-   `addBeacon` **Function** Callback to pass event data to so beacon can cast it.
-   `cb` **Function** (Optional) Callback to execute when an event is logged.

# startMessagePublicationRequestsFilter

[lib/events.js:216-239](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/events.js#L216-L239 "Source code on GitHub")

Starts listening for message publication request events on blockchain. Validates event data and invokes `server`'s 
addPublication method for each event.

**Parameters**

-   `eventsContractAddress` **String** Address of the deployed AnimistEvents contract
-   `addPublication` **Function** Callback to pass event data to so server can cast it.
-   `cb` **Function** (Optional) Callback to execute when an event is logged.

# startPresenceVerificationRequestsFilter

[lib/events.js:178-205](https://github.com/animist-io/whale-island/blob/f4adb42ad7dde265f433e620c2ebe7ba6a289f61/lib/events.js#L178-L205 "Source code on GitHub")

Starts listening for presence verfication request events on blockchain from proximityEvents DB's 
`lastBlock` to 'latest'. Validates event data, saves it and updates 'lastBlock' value to the 
event's blockNumber.

**Parameters**

-   `eventsContractAddress` **String** Address of the deployed AnimistEvents contract
-   `cb` **Function** (Optional) Callback to execute when an event is logged and saved in the DB
