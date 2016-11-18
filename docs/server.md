# addPublication

[lib/server.js:126-149](https://github.com/animist-io/whale-island/blob/695c0715e6cb1b67716314e5978ad053361b2df7/lib/server.js#L126-L149 "Source code on GitHub")

Updates servers characteristics to include an endpoint which checks client authorization
to read message, responds with `message`, writes confirmation of the transmission to client contract
and disconnects. Sets a timeout to remove characteristic at date `expires`.

**Parameters**

-   `args` **Object** `{ uuid: <string>, message: <string>, expires: <number>, contractAddress: <string> }`

Returns **Promise** Result of DB gets/puts.

# isUniqueUUID

[lib/server.js:94-97](https://github.com/animist-io/whale-island/blob/695c0715e6cb1b67716314e5978ad053361b2df7/lib/server.js#L94-L97 "Source code on GitHub")

Verifies that this uuid is NOT already being published.

**Parameters**

-   `uuid` **String** v4 uuid formatted with dashes
-   `args` **Object** publication event args

Returns **Boolean** true if uuid is not already being published, false otherwise

# prepPublicationsOnLaunch

[lib/server.js:105-116](https://github.com/animist-io/whale-island/blob/695c0715e6cb1b67716314e5978ad053361b2df7/lib/server.js#L105-L116 "Source code on GitHub")

Goes through publications in the animistEvents db on startup to remove any that have expired while
node was down. Sets new timeouts to remove publications as they expire while
whale-island is powered on.

Returns **Promise** Result of pouchDB gets/puts

# scheduleRemoval

[lib/server.js:156-168](https://github.com/animist-io/whale-island/blob/695c0715e6cb1b67716314e5978ad053361b2df7/lib/server.js#L156-L168 "Source code on GitHub")

Removes an expired publication and updates the current broadcast

**Parameters**

-   `pub` **Object** `{ characteristic: <bleno object>, expires: <date ms> }`
-   `duration` **Number** ms before removal

# updateBroadcast

[lib/server.js:173-197](https://github.com/animist-io/whale-island/blob/695c0715e6cb1b67716314e5978ad053361b2df7/lib/server.js#L173-L197 "Source code on GitHub")

Resets service to include a new publication
