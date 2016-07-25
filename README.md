# whale-island
[![Build Status](https://travis-ci.org/animist-io/whale-island.svg?branch=master)](https://travis-ci.org/animist-io/whale-island)

(This repo is in the earliest stages of development. Unusable.)

A micro-computer based Ethereum client and Bluetooth beacon that connects to mobile devices with a BLE server. Its API targets contract contingencies about location. 

``` 
Installation Notes:

// Raspbian Bleno
$ sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev 

// CouchDB (Debian)
$ sudo apt-get install couchdb
$ npm install -g add-cors-to-couchdb
$ add-cors-to-couchdb

// CouchDB (OSx) Download native from Apache

```

```
Basic commands:

// Test
$ gulp test (single run) 

// Tests in Travis CI context / bsh shell
$ export TRAVIS=true
$ gulp test
$ unset TRAVIS

// Server
% node lib/server.js start
```


