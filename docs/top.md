# whale-island
[![Build Status](https://travis-ci.org/animist-io/whale-island.svg?branch=master)](https://travis-ci.org/animist-io/whale-island) (This repo is in the earliest stages of development. Unusable.)

A micro-computer based Ethereum client and Bluetooth beacon that connects to mobile devices with a BLE server. Its API targets contract contingencies about location. 

### Installation

Raspbian Bleno
``` 
$ sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev 
```

CouchDB (Debian). For OSx download the .dmg directly from Apache
```
$ sudo apt-get install couchdb
$ npm install -g add-cors-to-couchdb
$ add-cors-to-couchdb
```

### Tests 

(set env var TRAVIS to true simulate Travis CI execution)
```
$ mocha --timeout 5s 

$ export TRAVIS=true
$ mocha --timeout 5s 
$ unset TRAVIS
```

### Run 
```
% node lib/server.js start
```

### Generate Docs
```
% gulp documentation
```

### Device UUIDs

Every animist endpoint broadcasts one of five unique 128bit beacon ids and provides access to server endpoints and broadcast events at corresponding BLE service uuids.

| Beacon UUID | Server UUID  | 
| ----------- | ------------ | 
| 4F7C5946-87BB-4C50-8051-D503CEBA2F19 | 05DEE885-E723-438F-B733-409E4DBFA694 |
| D4FB5D93-B1EF-42CE-8C08-CF11685714EB | 9BD991F7-0CB9-4FA7-A075-B3AB1B9CFAC8 |
| 98983597-F322-4DC3-A36C-72052BF6D612 | 98983597-F322-4DC3-A36C-72052BF6D612 |
| 8960D5AB-3CFA-46E8-ADE2-26A3FB462053 | 33A93F3C-9CAA-4D39-942A-6659AD039232 |
| 458735FA-E270-4746-B73E-E0C88EA6BEE0 | 01EC8B5B-B7DB-4D65-949C-81F4FD808A1A |

### Hex Response Codes

Endpoints respond with a hex code indicating whether or not the request is valid. Requested data (if available) follows after a min. 50ms delay. 

| Name | Value |                 | Name | Value |
|------|-------|-----------------|------|-------|
|INVALID_JSON_IN_REQUEST|0x02|   |INVALID_SESSION_ID|0x0E|
|INVALID_TX_HASH|0x07|           |INVALID_CALL_DATA|0x11|
|INVALID_PIN|0x09|               |SESSION_NOT_FOUND|0x10|
|INVALID_TX_SENDER_ADDRESS|0x0A| |TX_PENDING|0x0F|
|INVALID_TX_SIGNATURE|0x0B|      |NO_SIGNED_MSG_IN_REQUEST|0x03| 
|INSUFFICIENT_GAS|0x0C|          |NO_TX_DB_ERR|0x04|
|INSUFFICIENT_BALANCE|0x0D|      |NO_TX_ADDR_ERR|0x05|
|NO_ETHEREUM|0x08|               |RESULT_SUCCESS|0x00|



### Other code documentation

[Web3 interface methods](https://github.com/animist-io/whale-island/blob/master/docs/eth.md)

[Utility methods (request parsers, etc)](https://github.com/animist-io/whale-island/blob/master/docs/util.md)




