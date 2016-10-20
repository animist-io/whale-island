# addPresenceVerificationRequest

[lib/events.js:140-146](https://github.com/animist-io/whale-island/blob/ca10d453eaca9910ccac2cbeb819747293a0562e/lib/events.js#L140-L146 "Source code on GitHub")

Adds account address to verify the presence of and the address of the contract requesting this service 
to the proximityEvents db. Will not allow duplicate clients.
`{_id: <Account address>, contractAddress: <Contract address>}`

**Parameters**

-   `event` **Object** `{account: <address>, contractAddress: <address>}`

# changeBroadcast

[lib/events.js:182-201](https://github.com/animist-io/whale-island/blob/ca10d453eaca9910ccac2cbeb819747293a0562e/lib/events.js#L182-L201 "Source code on GitHub")

Updates broadcast to reflect current set of `characteristics`.

# generateBeaconSignature

[lib/events.js:165-177](https://github.com/animist-io/whale-island/blob/ca10d453eaca9910ccac2cbeb819747293a0562e/lib/events.js#L165-L177 "Source code on GitHub")

Combines requested Beacon uuid and randomly generated major and minor
values into a string. Signs this with the nodeAccount and formats it correctly
for passage to submit to client's submitSignedBeaconId method

**Parameters**

-   `uuid` **String** v4 uuid
-   `major` **Number** Integer btw 0 and 65535
-   `minor` **Number** Integer btw 0 and 65535

Returns **Object** EC sig obj that Solidity will parse correctly

# generateRandom2ByteInt

[lib/events.js:152-154](https://github.com/animist-io/whale-island/blob/ca10d453eaca9910ccac2cbeb819747293a0562e/lib/events.js#L152-L154 "Source code on GitHub")

Generates a random value within the limits of allowed major and minor beacon values

Returns **Number** Number between 0 and 65535 inclusive

# getLastSavedBlock

[lib/events.js:112-117](https://github.com/animist-io/whale-island/blob/ca10d453eaca9910ccac2cbeb819747293a0562e/lib/events.js#L112-L117 "Source code on GitHub")

Retrieves last block for which an event was logged. This allows whale-island to synch its 
events db to blockchain if it's been turned off without filtering for every event since
the device's genesis block

**Parameters**

-   `db` **Object** Event DB

Returns **Number** Block number

Returns **Promise** Result of db.get OR device genesis block if DB is new.

# isValidDuration

[lib/events.js:64-68](https://github.com/animist-io/whale-island/blob/ca10d453eaca9910ccac2cbeb819747293a0562e/lib/events.js#L64-L68 "Source code on GitHub")

Validates duration arg of a message publication event log. Duration must at least 1 sec and 
smaller than the max value of uint32.

**Parameters**

-   `duration` **BigNumber** milliseconds to broadcast for

Returns **Boolean** True if duration valid, false otherwise.

# isValidMessage

[lib/events.js:76-78](https://github.com/animist-io/whale-island/blob/ca10d453eaca9910ccac2cbeb819747293a0562e/lib/events.js#L76-L78 "Source code on GitHub")

Validates message arg of a message publication event log. Message must be non-null and
less than or equal to config.MAX_MESSAGE_LENGTH

**Parameters**

-   `message` **String** 

Returns **Boolean** True if message is valid, false otherwise.

# isValidMessagePublicationEvent

[lib/events.js:86-91](https://github.com/animist-io/whale-island/blob/ca10d453eaca9910ccac2cbeb819747293a0562e/lib/events.js#L86-L91 "Source code on GitHub")

Validates message publication event data.

**Parameters**

-   `event` **Object** `{ uuid: <uuid string>, message: <string>, duration: <number of ms>` }

Returns **Boolean** True if data validates, false otherwise.

# isValidPresenceVerificationEvent

[lib/events.js:98-102](https://github.com/animist-io/whale-island/blob/ca10d453eaca9910ccac2cbeb819747293a0562e/lib/events.js#L98-L102 "Source code on GitHub")

Validates presence verification request event data

**Parameters**

-   `event` **Objects** `{ account: <address>, contract: <address>}` }

Returns **Boolean** True if data validates, false otherwise.

# saveBlock

[lib/events.js:126-132](https://github.com/animist-io/whale-island/blob/ca10d453eaca9910ccac2cbeb819747293a0562e/lib/events.js#L126-L132 "Source code on GitHub")

Saves blocknumber of most recently logged event. This value serves as a starting point for the 
events filter in the start...EventFilter methods

**Parameters**

-   `db` **Object** Event DB
-   `block` **Number** Current block number

# startMessagePublicationRequestsFilter

[lib/events.js:243-261](https://github.com/animist-io/whale-island/blob/ca10d453eaca9910ccac2cbeb819747293a0562e/lib/events.js#L243-L261 "Source code on GitHub")

Starts listening for message publication request events on blockchain. Validates event data and changes the broadcast.

**Parameters**

-   `eventsContractAddress`  
-   `startBlock`  
-   `cb` **Function** (Optional) Callback to execute when an event is logged.

# startPresenceVerificationRequestsFilter

[lib/events.js:211-236](https://github.com/animist-io/whale-island/blob/ca10d453eaca9910ccac2cbeb819747293a0562e/lib/events.js#L211-L236 "Source code on GitHub")

Starts listening for presence verfication request events on blockchain from proximityEvents DB's 
`lastBlock` to 'latest'. Validates event data, saves it and updates 'lastBlock' value to the 
event's blockNumber.

**Parameters**

-   `eventsContractAddress`  
-   `cb` **Function** (Optional) Callback to execute when an event is logged and saved in the DB
