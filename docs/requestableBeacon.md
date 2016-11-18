# addBeacon

[lib/requestableBeacon.js:68-77](https://github.com/animist-io/whale-island/blob/833ad0471dc35329206864068bd4947806ea3f3e/lib/requestableBeacon.js#L68-L77 "Source code on GitHub")

Adds beacon to queue. If queue was empty, initiates beacon transmission.

**Parameters**

-   `uuid` **String** v4 uuid
-   `major` **Number** two byte integer
-   `minor` **Number** two byte integer

# onAdvertisingError

[lib/requestableBeacon.js:36-39](https://github.com/animist-io/whale-island/blob/833ad0471dc35329206864068bd4947806ea3f3e/lib/requestableBeacon.js#L36-L39 "Source code on GitHub")

Prints error to terminal, sets advertising flag to false

**Parameters**

-   `err` **String** bleno error

# onAdvertisingStart

[lib/requestableBeacon.js:46-50](https://github.com/animist-io/whale-island/blob/833ad0471dc35329206864068bd4947806ea3f3e/lib/requestableBeacon.js#L46-L50 "Source code on GitHub")

Sets a timeout to stop advertising beacon after `config.beaconBroadcastInterval` ms.
If there is an error, tries to initiate next queued beacon transmission.

**Parameters**

-   `err` **String** bleno error

# onAdvertisingStop

[lib/requestableBeacon.js:55-58](https://github.com/animist-io/whale-island/blob/833ad0471dc35329206864068bd4947806ea3f3e/lib/requestableBeacon.js#L55-L58 "Source code on GitHub")

Initiates next queued beacon transmission.

# onStateChange

[lib/requestableBeacon.js:23-30](https://github.com/animist-io/whale-island/blob/833ad0471dc35329206864068bd4947806ea3f3e/lib/requestableBeacon.js#L23-L30 "Source code on GitHub")

Sets poweredOn flag (which must be true for a beacon to be added to queue )

**Parameters**

-   `state` **String** bleno state descriptor

# startAdvertisingNextBeacon

[lib/requestableBeacon.js:82-96](https://github.com/animist-io/whale-island/blob/833ad0471dc35329206864068bd4947806ea3f3e/lib/requestableBeacon.js#L82-L96 "Source code on GitHub")

De-queues requested beacon data and starts advertising it
