module.exports = {

    // Animist platform identity beacon uuid
  'beaconId': '4F7C5946-87BB-4C50-8051-D503CEBA2F19',
  'beaconMajor': 0,
  'beaconMinor': 0,

    // Requestable beacon measured power constant (value from Bleno)
  'measuredIBeaconPower': -59,

    // Default length of time to broadcast a requestable beacon for
  'beaconBroadcastInterval': 15000,

    // Animist platform server service uuid
  'serverServiceId': '05DEE885-E723-438F-B733-409E4DBFA694',

    // Animist platform deployed events contract address
  'animistEvent': '0xf802....cdec',

    // This endpoints ethereum account address. (For testing: this is account[3] from rpc.sh script)
  'animistAccount': '0x4dea71bde50f23d347d6b21e18c50f02221c50ad',

    // This peripheral's unique Animist id and human-readable name
  'nodeId': 'some id here',
  'serverName': 'Animist Server Testing',

    // Platform wide characteristic ids / API
  'characteristicUUIDS': {
    'getPin': 'C40C94B3-D9FF-45A0-9A37-032D72E423A9',
    'getDeviceAccount': '1FD26CCA-EA2B-4B9E-A59E-17AA7E61A0AC',
    'getBlockNumber': 'C888866C-3499-4B80-B145-E1A61620F885',
    'getPgpKeyId': '75C06966-FEF2-4B23-A5AE-60BA8A5C622C',
    'getAccountBalance': 'A85B7044-F1C5-43AD-873A-CF923B6D62E7',
    'getTxStatus': '03796948-4475-4E6F-812E-18807B28A84A',
    'getClientTxStatus': '421522D1-C7EE-494C-A1E4-029BBE644E8D',
    'getPresenceReceipt': 'BA2C3091-DAB8-4D51-BF92-3A6F023E9AD7',
    'getContract': 'BFA15C55-ED8F-47B4-BD6A-31280E98C7BA',
    'getContractAddress': '007A62CC-068F-4E85-898E-7EA98AD4E31B',
    'verifyPresence': '297E3B0A-F353-4531-9D44-3686CC8C4036',
    'verifyPresenceAndSendTx': '8D8577B9-E2F0-4750-BB82-421750D9BF86',
    'sendTx': '3340BC2C-70AE-4E7A-BE24-8B2ED8E3ED06',
    'callTx': '4506C117-0A27-4D90-94A1-08BB81B0738F'
  },

    // Hex codes (except EOF) to send confirming central writes
  'codes': {
    'INVALID_JSON_IN_REQUEST': 0x02,    //2
    'INVALID_TX_HASH': 0x07,            //7
    'INVALID_PIN': 0x09,                //9
    'INVALID_TX_SENDER_ADDRESS': 0x0A,  //10
    'INVALID_TX_SIGNATURE': 0x0B,       //11 
    'INSUFFICIENT_GAS': 0x0C,           //12 
    'INSUFFICIENT_BALANCE': 0x0D,       //13
    'NOT_AUTHORIZED': 0x0E,             //14
    'DECRYPTION_FAILED': 0x12,          //18
    'INVALID_CALL_DATA': 0x11,          //17
    'SESSION_NOT_FOUND': 0x10,          //16
    'TX_PENDING': 0x0F,                 //15
    'NO_SIGNED_MSG_IN_REQUEST': 0x03,   //3
    'NO_TX_DB_ERR': 0x04,               //4
    'NO_TX_ADDR_ERR': 0x05,             //5
    'NO_ETHEREUM': 0x08,                //8
    'RESULT_SUCCESS': 0x00,             //0
    'EOF': 'EOF'
  },

    // The maximum number of bytes to send per BLE write packet. (Working for iOS. Android unknown )
  'MAX_SEND': 128,

    // Maximum length of message broadcast using the requestBroadcast contract API
  'MAX_MESSAGE_LENGTH': 128,

    // Minimum duration (ms) of a message broadcast using the requestBroadcast contract API (1 sec)
  'MIN_BROADCAST_DURATION': 1000,

    // Maximum duration (ms) of a message broadcast using the requestBroadcast contract API (uint32 max)
  'MAX_BROADCAST_DURATION': 4294967295,

    // Interval in ms to wait for a pin-enabled req before clearing PIN value. (Default: 250 ms).
  'PIN_RESET_INTERVAL': 250,

    // Interval in ms to check if a pending tx has been mined. (Default: 20 sec)
  'MINING_CHECK_INTERVAL': 20000,

    // Number of mining check intervals to wait for a tx to be mined before quitting (Default: 128)
  'MAX_CONFIRMATION_CYCLES': 128,

  'deviceGenesisBlock': 0,

    // Location. The lat/lng of this device.
  'location': { 'lat': 0.00, 'lng': 0.00 },

    // Public PGP KeyID - can be used to fetch public key from 'https://pgp.mit.edu'
  'pgpKeyId': '32e6aa474db4f922',

    // methods ABI. Default animist methods called with the animist account. Like verification.
  'methodsABI': [{'constant': false, 'inputs': [{'name': 'v', 'type': 'uint8'}, {'name': 'r', 'type': 'bytes32'}, {'name': 's', 'type': 'bytes32'}], 'name': 'submitSignedBeaconId', 'outputs': [], 'type': 'function'}, {'constant': true, 'inputs': [{'name': 'visitor', 'type': 'address'}, {'name': 'uuid', 'type': 'string'}], 'name': 'isAuthorizedToReadMessage', 'outputs': [{'name': 'result', 'type': 'bool'}], 'type': 'function'}, {'constant': false, 'inputs': [{'name': 'visitor', 'type': 'address'}, {'name': 'uuid', 'type': 'string'}, {'name': 'time', 'type': 'uint64'}], 'name': 'confirmMessageDelivery', 'outputs': [], 'type': 'function'}, {'constant': false, 'inputs': [{'name': 'visitor', 'type': 'address'}, {'name': 'time', 'type': 'uint64'}], 'name': 'verifyPresence', 'outputs': [], 'type': 'function'}],

    // eventsABI: Deployed contract events methods.
  'eventsABI': [{'constant': false, 'inputs': [{'name': 'node', 'type': 'address'}, {'name': 'uuid', 'type': 'string'}, {'name': 'contractAddress', 'type': 'address'}], 'name': 'requestBeaconBroadcast', 'outputs': [], 'type': 'function'}, {'constant': false, 'inputs': [{'name': 'node', 'type': 'address'}, {'name': 'account', 'type': 'address'}, {'name': 'contractAddress', 'type': 'address'}], 'name': 'requestPresenceVerification', 'outputs': [], 'type': 'function'}, {'constant': false, 'inputs': [{'name': 'node', 'type': 'address'}, {'name': 'uuid', 'type': 'string'}, {'name': 'message', 'type': 'string'}, {'name': 'expires', 'type': 'uint64'}, {'name': 'contractAddress', 'type': 'address'}], 'name': 'requestMessagePublication', 'outputs': [], 'type': 'function'}, {'anonymous': false, 'inputs': [{'indexed': true, 'name': 'node', 'type': 'address'}, {'indexed': true, 'name': 'account', 'type': 'address'}, {'indexed': true, 'name': 'contractAddress', 'type': 'address'}], 'name': 'LogPresenceVerificationRequest', 'type': 'event'}, {'anonymous': false, 'inputs': [{'indexed': true, 'name': 'node', 'type': 'address'}, {'indexed': false, 'name': 'uuid', 'type': 'string'}, {'indexed': false, 'name': 'message', 'type': 'string'}, {'indexed': false, 'name': 'expires', 'type': 'uint64'}, {'indexed': false, 'name': 'contractAddress', 'type': 'address'}], 'name': 'LogMessagePublicationRequest', 'type': 'event'}, {'anonymous': false, 'inputs': [{'indexed': true, 'name': 'node', 'type': 'address'}, {'indexed': false, 'name': 'uuid', 'type': 'string'}, {'indexed': false, 'name': 'contractAddress', 'type': 'address'}], 'name': 'LogBeaconBroadcastRequest', 'type': 'event'}],
  'testABI': [{'constant': false, 'inputs': [{'name': 'v', 'type': 'uint8'}, {'name': 'r', 'type': 'bytes32'}, {'name': 's', 'type': 'bytes32'}], 'name': 'submitSignedBeaconId', 'outputs': [], 'type': 'function'}, {'constant': true, 'inputs': [], 'name': 'client', 'outputs': [{'name': '', 'type': 'address'}], 'type': 'function'}, {'constant': true, 'inputs': [], 'name': 'getState', 'outputs': [{'name': 'val', 'type': 'uint256'}], 'type': 'function'}, {'constant': true, 'inputs': [], 'name': 'getVerified', 'outputs': [{'name': 'status', 'type': 'bool'}], 'type': 'function'}, {'constant': true, 'inputs': [], 'name': 'getClient', 'outputs': [{'name': 'client', 'type': 'address'}], 'type': 'function'}, {'constant': false, 'inputs': [{'name': 'visitor', 'type': 'address'}, {'name': 'time', 'type': 'uint64'}], 'name': 'verifyPresence', 'outputs': [], 'type': 'function'}, {'constant': false, 'inputs': [{'name': 'val', 'type': 'bool'}], 'name': 'setVerified', 'outputs': [], 'type': 'function'}, {'constant': true, 'inputs': [], 'name': 'timeVerified', 'outputs': [{'name': '', 'type': 'uint64'}], 'type': 'function'}, {'constant': false, 'inputs': [{'name': 'time', 'type': 'uint64'}], 'name': 'setTimeVerified', 'outputs': [], 'type': 'function'}, {'constant': false, 'inputs': [{'name': 'newClient', 'type': 'address'}], 'name': 'setClient', 'outputs': [], 'type': 'function'}, {'constant': true, 'inputs': [], 'name': 'getTimeVerified', 'outputs': [{'name': 'time', 'type': 'uint256'}], 'type': 'function'}, {'constant': false, 'inputs': [{'name': 'val', 'type': 'uint256'}], 'name': 'setState', 'outputs': [], 'type': 'function'}, {'constant': true, 'inputs': [], 'name': 'verified', 'outputs': [{'name': '', 'type': 'bool'}], 'type': 'function'}, {'constant': true, 'inputs': [], 'name': 'state', 'outputs': [{'name': '', 'type': 'uint256'}], 'type': 'function'}, {'constant': true, 'inputs': [{'name': 'receivedStartSignal', 'type': 'string'}, {'name': 'signingNode', 'type': 'address'}], 'name': 'receivedBeaconMatchesSignedBeacon', 'outputs': [{'name': 'result', 'type': 'bytes32'}], 'type': 'function'}, {'constant': false, 'inputs': [], 'name': 'resetAll', 'outputs': [], 'type': 'function'}, {'constant': false, 'inputs': [], 'name': 'advanceBlock', 'outputs': [], 'type': 'function'}, {'inputs': [], 'type': 'constructor'}],
  'eventsContractAddress': null,

    // Errors
  'events': {
        // events.js: filtering for logged requests for proximity detection/broadcast.
    'filters': {
      'dbError': 'EthFilter:db-error',
      'web3Error': 'EthFilter:web3-error',
      'validationError': 'EthFilter:validation-error',
      'blenoError': 'EthFilter:bleno-error'
    }
  },

    // Default broadcast length is 5 min
  'defaultBroadcastDurationMs': 30000,

    // ----------------------------- DEVELOPMENT ------------------------
  'fakeTx': {
    'code': '6060604052610381806100136000396000f30060606040526000357c0100000000000000000000000000000000000000000000000000000000900480630ff4c9161461006557806329507f731461008c5780637b8d56e3146100a5578063c41a360a146100be578063f207564e146100fb57610063565b005b610076600480359060200150610308565b6040518082815260200191505060405180910390f35b6100a36004803590602001803590602001506101b3565b005b6100bc60048035906020018035906020015061026e565b005b6100cf600480359060200150610336565b604051808273ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b61010c60048035906020015061010e565b005b60006000600050600083815260200190815260200160002060005060000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1614156101af57336000600050600083815260200190815260200160002060005060000160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908302179055505b5b50565b3373ffffffffffffffffffffffffffffffffffffffff166000600050600084815260200190815260200160002060005060000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16141561026957806000600050600084815260200190815260200160002060005060000160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908302179055505b5b5050565b3373ffffffffffffffffffffffffffffffffffffffff166000600050600084815260200190815260200160002060005060000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff161415610303578060006000506000848152602001908152602001600020600050600101600050819055505b5b5050565b600060006000506000838152602001908152602001600020600050600101600050549050610331565b919050565b60006000600050600083815260200190815260200160002060005060000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905061037c565b91905056',
    'proximity': 'any',
    'authority': 'null'
  },

    // Decrypts private key in the keystore
  'pgpPassphrase': 'mgxuMbgMLRhJrUHEYs1mYEpZ1',

  'publicKey':

        '-----BEGIN PGP PUBLIC KEY BLOCK-----\r\n' +
        'Version: SKS 1.1.5\r\n' +
        'Comment: Hostname: pgp.mit.edu\r\n' +
        '\r\n' +
        'mI0EV/SMhgEEAJ0BYn3OOBQFf+o9iRTTWNtBFfr/BlFDTn9TyRucs0xwc4S3aUlQo9voWcGN\r\n' +
        'G4EDVoD6VtS9rKHiAItqAZRLCDzob/4z6fl5PF4kMWvkEBSbCtmSZ8T1EeW4pUcf5+Rz8E8C\r\n' +
        'nVbot4B00F1YJ6ymRCT25wXzyqbmdzjEp5P+49ShABEBAAG0HHY2aWxiQjAxUjljaUI1TWly\r\n' +
        'ZGxVb2owOVAgPD6ItQQQAQgAKQUCV/SMhwYLCQcIAwIJEDLmqkdNtPkiBBUIAgoDFgIBAhkB\r\n' +
        'AhsDAh4BAAAjHgP+LB2r51p1vgGuHlFg/sc+Shc7s4YUobTQXHglgLnF2n4d+yuAAM9f34HX\r\n' +
        '8nZllMQ/0xJK/yHksmTV19C/8yHlVpJYNBkKtWRUbdGzefFrIbrQ9YXYTDVvusrDsnyxozn+\r\n' +
        'C07LRzBdKqiDbh25lKAW962yqRiYz/JeHtkHQG7OGbu4jQRX9IyHAQQAjFxm6ehTAelercCJ\r\n' +
        '+k2HmkigHjJ++tFewX8hgTvngZ2xo3qrjYfhKosdhyDQrDv+WUbhEw4o3YvCr8lHn4W5pL+6\r\n' +
        '9OPhE4RPDlFbedrI0ocUd6LM7c4rD/8E09CS/sRQdJZ6oW2qU4uGjebqaVlrVQawNp3PeqcL\r\n' +
        '8GLPP+jtr6kAEQEAAYifBBgBCAATBQJX9IyHCRAy5qpHTbT5IgIbDAAAcKgD/2D1dtUuZ0W0\r\n' +
        'qVtdLSQBopNSsE3xYmoNGAHnVJWKJFoQ84p2oWAzERWOkDz4lQgGLp7/dEeqiXeAvn0pD5vR\r\n' +
        'q8dP8PXhF3H668acC5NVlURXDQi2hLfJmOcoQ36ct/wJGH/AlUSHnRzmz692zj/G1KTDOtwW\r\n' +
        '0NLVxiUUkzDtLIDS\r\n' +
        '=XUlZ\r\n' +
        '-----END PGP PUBLIC KEY BLOCK-----'
}

