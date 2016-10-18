'use strict'

const util = require("ethereumjs-util");

module.exports.detectionRequestEvent = {
    "logIndex":0,
    "transactionIndex":0,
    "transactionHash":"0x477b87018e47653b7673309e5d1a67e4f46bab3af02d6fce9694582692e97f98",
    "blockHash":"0x01e501d70854d18cabc345c658e802cba5884d01b99d7429d9524985724d36d4",
    "blockNumber":161,
    "address":"0xb6cffb1accc092da59c3070009581c33ff2d1721",
    "type":"mined",
    "event":"LogRegistration",
    "args":{
        "node":"0x34c7cdc2afced5aaea97f0cb92c39552ed5cefd2",
        "account":"0x78fa5c38a417af2661dacc8d878e13073ef9eaaa",
        "contractAddress":"0x7d93d13e941a81b383c1ca093f087b69573f0cce"}
    }

module.exports.messageTooLong = `
    0x477b87018e47653b7673309e5d1a67e4f46bab3af02d6fce9694582692e97f98
    0x477b87018e47653b7673309e5d1a67e4f46bab3af02d6fce9694582692e97f98
    0x477b87018e47653b7673309e5d1a67e4f46bab3af02d6fce9694582692e97f98
    0x477b87018e47653b7673309e5d1a67e4f46bab3af02d6fce9694582692e97f98
    0x477b87018e47653b7673309e5d1a67e4f46bab3af02d6fce9694582692e97f98
    0x477b87018e47653b7673309e5d1a67e4f46bab3af02d6fce9694582692e97f98
    0x477b87018e47653b7673309e5d1a67e4f46bab3af02d6fce9694582692e97f98
    0x477b87018e47653b7673309e5d1a67e4f46bab3af02d6fce9694582692e97f98
    0x477b87018e47653b7673309e5d1a67e4f46bab3af02d6fce9694582692e97f98
    0x477b87018e47653b7673309e5d1a67e4f46bab3af02d6fce9694582692e97f98
    0x477b87018e47653b7673309e5d1a67e4f46bab3af02d6fce9694582692e97f98
    0x477b87018e47653b7673309e5d1a67e4f46bab3af02d6fce9694582692e97f98
`;

module.exports.broadcast_1 = {
  "logIndex": 0,
  "transactionIndex": 0,
  "transactionHash": "0xd5c52bd468852b59e8acbdc8a5038e7c55491cf86252ce83f77b5aa8a33179b8",
  "blockHash": "0x2d5faa937b64f51acdf5873470a709d9b27f72ceafa74e02fa5e68851de05670",
  "blockNumber": 10268,
  "address": "0xb8504497726a416a39122ced556aea096f247a34",
  "type": "mined",
  "event": "LogBroadcastRequest",
  "args": {
    "node": "0x579fadbb36a7b7284ef4e50bbc83f3f294e9a8ec",
    "uuid": "C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8",
    "message": "hello",
    "duration": new util.BN(10)
  }
}

module.exports.broadcast_2 = {
  "logIndex": 1,
  "transactionIndex": 0,
  "transactionHash": "0xd5c52bd468852b59e8acbdc8a5038e7c55491cf86252ce83f77b5aa8a33179b8",
  "blockHash": "0x2d5faa937b64f51acdf5873470a709d9b27f72ceafa74e02fa5e68851de05670",
  "blockNumber": 10268,
  "address": "0xb8504497726a416a39122ced556aea096f247a34",
  "type": "mined",
  "event": "LogBroadcastRequest",
  "args": {
    "node": "0x579fadbb36a7b7284ef4e50bbc83f3f294e9a8ec",
    "uuid": "9138DF9F-39D5-49A5-A590-047550432ACC",
    "message": "hello",
    "duration": new util.BN(10)
  }
}