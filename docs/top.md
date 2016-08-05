# whale-island
[![Build Status](https://travis-ci.org/animist-io/whale-island.svg?branch=master)](https://travis-ci.org/animist-io/whale-island)

(This repo is in the earliest stages of development. Unusable.)

A micro-computer based Ethereum client and Bluetooth beacon that connects to mobile devices with a BLE server. Its API targets contract contingencies about location. 


### Installation Notes:

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

### CLI:

Tests (set env var TRAVIS to true simulate Travis CI execution)
```
$ mocha --timeout 5s 

$ export TRAVIS=true
$ mocha --timeout 5s 
$ unset TRAVIS
```

Run Server
```
% node lib/server.js start
```

Generate Docs
```
% gulp documentation
```


