# whale-island
[![Build Status](https://travis-ci.org/animist-io/whale-island.svg?branch=master)](https://travis-ci.org/animist-io/whale-island)

(This repo is in the earliest stages of development. TDD is being done.)

Basic commands:

```
(Test)
$ gulp test (single run) 

(Run tests for Travis CI context)
$ export TRAVIS=true
$ gulp test
$ unset TRAVIS

(Serve)
% node lib/server.js start
```

A Rasberry Pi iBeacon and Node.js server that authenticates Animist mobile clients and intermediates between them and an Ethereum node. 
