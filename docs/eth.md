# callTx

[lib/eth.js:119-121](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/eth.js#L119-L121 "Source code on GitHub")

Wraps web3.eth.call. Method should require no gas and no "from" parameter. See onCallTx

**Parameters**

-   `method` **String** : a call to constant public function

Returns **String** hex encoded value per web3

# confirmMessageDelivery

[lib/eth.js:330-342](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/eth.js#L330-L342 "Source code on GitHub")

Invokes client contract method `confirmMessageDelivery` and returns boolean.

**Parameters**

-   `args` **Object** Event args from a requestMessagePublication event
-   `client` **String** Account address of connected client requesting message.

Returns **Boolean** True if it was possible to invoke method, false otherwise.

# getAccountBalance

[lib/eth.js:84-86](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/eth.js#L84-L86 "Source code on GitHub")

Wraps web3.eth.getBalance

**Parameters**

-   `address`  

Returns **String** representing amount of wei

# getBlockNumber

[lib/eth.js:75-77](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/eth.js#L75-L77 "Source code on GitHub")

Wraps web3.eth.blockNumber.

Returns **Number** 

# getContract

[lib/eth.js:150-166](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/eth.js#L150-L166 "Source code on GitHub")

Extracts client address from signed pin and looks for record from eventsDB with that id. Returns object
that contains contract address and contract's code.

**Parameters**

-   `pin`  
-   `signed`  

Returns **Promise** Resolves contract data: `{contractAddress: '0x821af...05', code: '0x453ce...03'}`

Returns **Promise** Rejects with hex code: NO_TX_DB_ERR or NO_TX_ADDR_ERR

# getContractAddress

[lib/eth.js:175-186](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/eth.js#L175-L186 "Source code on GitHub")

Extracts client address from signed pin and looks for record from eventsDB with that id. Returns object
that contains contract address and contract's code.

**Parameters**

-   `pin`  
-   `signed`  

Returns **Promise** Resolves string contract address: '0x821af...05'

Returns **Promise** Rejects with hex code: NO_TX_DB_ERR or NO_TX_ADDR_ERR

# getPresenceReceipt

[lib/eth.js:97-112](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/eth.js#L97-L112 "Source code on GitHub")

Responds with data that can be used to authenticate clients presence near
endpoint. (See onGetPresenceReceipt in lib/handlers.js)

**Parameters**

-   `pin` **String** : current pin value
-   `signedPin` **String** : current pin signed by caller's account

Returns **Object** {time: '1453...9', signedTime: '0xaf..9e', signedAddress: '0x32...ae'}

Returns **Object** Null on error.

# getTx

[lib/eth.js:131-141](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/eth.js#L131-L141 "Source code on GitHub")

Queries blockchain for transaction receipt.

**Parameters**

-   `txHash`  

Returns **Promise** Resolves { blocknumber: int (or null), nonce: int, gas: int }

Returns **Promise** Rejects w/ hex code: NO_TX_DB_ERR

# isAuthorizedToReadMessage

[lib/eth.js:313-322](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/eth.js#L313-L322 "Source code on GitHub")

Invokes client contract method: `isAuthorizedToReadMessage` and returns boolean result.

**Parameters**

-   `args` **Object** Event args from a requestMessagePublication event
-   `client` **String** Account address of connected client requesting message.

Returns **Boolean** True if client can receive msg, false otherwise.

# recover

[lib/eth.js:48-66](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/eth.js#L48-L66 "Source code on GitHub")

Recovers address used to sign a message, which may be encoded in eth-lightwallet or web3.sign 
formats. (Will generate non-existent address if data signed and 'rawMsg' are not identical.)

**Parameters**

-   `rawMsg` **String** : the endpoints currently broadcast pin
-   `signed` **Object or String** : a value signed by the callers account

Returns **String** account: hex prefixed public address of msg signer.

Returns **** undefined if ethereumjs-util throws an error during recovery.

# sendTx

[lib/eth.js:219-221](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/eth.js#L219-L221 "Source code on GitHub")

Prints client-signed tx to blockchain. A wrapper for web3 sendRawTransaction.

**Parameters**

-   `tx` **String** : a signed transaction

Returns **String** txHash of sendRawTransaction

# sendTxWhenPresenceVerified

[lib/eth.js:233-305](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/eth.js#L233-L305 "Source code on GitHub")

Waits for verifyPresence tx to be mined then sends tx. Updates client's contract record with 
verifyPresenceTx's status when pending, successful, failed and saves signed client Tx transaction hash to 
record on success.

**Parameters**

-   `verifyPresenceTxHash` **String** : hash of pending presence verification tx sent by animist device
-   `signedTx` **String** : signed tx submittable w/ eth.sendRawTransaction
-   `address` **String** : the client account address
-   `cb` **Function** : optional callback for unit testing.

# verifyPresence

[lib/eth.js:195-211](https://github.com/animist-io/whale-island/blob/8f2f4d54de2b7ca867872afbe60874904bd224ee/lib/eth.js#L195-L211 "Source code on GitHub")

Invokes verifyPresence on the contract discovered in the contractsDB. 
verifyPresence prints caller was here, 'timestamped' now, to chain.

**Parameters**

-   `pin`  
-   `signed`  

Returns **Promise** Resolves hash string of pending presence verification tx.

Returns **Promise** Rejects w/ hex code: NO_TX_FOUND
