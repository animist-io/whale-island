# authTx

[lib/eth.js:184-200](https://github.com/animist-io/whale-island/blob/e5ee75a5b455d32218a248b9eedf86be20f82350/lib/eth.js#L184-L200 "Source code on GitHub")

Invokes verifyPresence on the contract discovered in the contractsDB. 
verifyPresence prints caller was here, 'timestamped' now, to chain.

**Parameters**

-   `pin`  
-   `signed`  

Returns **Promise** Resolves hash string of pending AuthTx

Returns **Promise** Rejects w/ hex code: NO_TX_FOUND

# callTx

[lib/eth.js:119-121](https://github.com/animist-io/whale-island/blob/e5ee75a5b455d32218a248b9eedf86be20f82350/lib/eth.js#L119-L121 "Source code on GitHub")

Wraps web3.eth.call. Method should require no gas and no "from" parameter. See onCallTx

**Parameters**

-   `method` **String** : a call to constant public function

Returns **String** hex encoded value per web3

# getAccountBalance

[lib/eth.js:84-86](https://github.com/animist-io/whale-island/blob/e5ee75a5b455d32218a248b9eedf86be20f82350/lib/eth.js#L84-L86 "Source code on GitHub")

Wraps web3.eth.getBalance

**Parameters**

-   `address`  

Returns **String** representing amount of wei

# getBlockNumber

[lib/eth.js:75-77](https://github.com/animist-io/whale-island/blob/e5ee75a5b455d32218a248b9eedf86be20f82350/lib/eth.js#L75-L77 "Source code on GitHub")

Wraps web3.eth.blockNumber.

Returns **Number** 

# getContract

[lib/eth.js:157-175](https://github.com/animist-io/whale-island/blob/e5ee75a5b455d32218a248b9eedf86be20f82350/lib/eth.js#L157-L175 "Source code on GitHub")

Extracts address from signed pin and looks for record from contractsDB with that id.

**Parameters**

-   `pin`  
-   `signed`  

**Examples**

```javascript
Sample contract event object:    
{
code: '0x453ce...03' (long contract code string), 
account: '0x757fe...04' (account addr. specified in the contract event, should be endpoint caller) 
authority: '0x251ae...05' (account addr. designated to sign transactions for this contract on behalf of caller)
contractAddress: '0x821af...05' (address of deployed contract).
}
```

Returns **Promise** Resolves contract event record

Returns **Promise** Rejects with hex code: NO_TX_DB_ERR or NO_TX_ADDR_ERR

# getPresenceReceipt

[lib/eth.js:97-112](https://github.com/animist-io/whale-island/blob/e5ee75a5b455d32218a248b9eedf86be20f82350/lib/eth.js#L97-L112 "Source code on GitHub")

Responds with data that can be used to authenticate clients presence near
endpoint. (See onGetPresenceReceipt in lib/handlers.js)

**Parameters**

-   `pin` **String** : current pin value
-   `signedPin` **String** : current pin signed by caller's account

Returns **Object** {time: '1453...9', signedTime: '0xaf..9e', signedAddress: '0x32...ae'}

Returns **Object** Null on error.

# getTx

[lib/eth.js:131-141](https://github.com/animist-io/whale-island/blob/e5ee75a5b455d32218a248b9eedf86be20f82350/lib/eth.js#L131-L141 "Source code on GitHub")

Queries blockchain for transaction receipt.

**Parameters**

-   `txHash`  

Returns **Promise** Resolves { blocknumber: int (or null), nonce: int, gas: int }

Returns **Promise** Rejects w/ hex code: NO_TX_DB_ERR

# recover

[lib/eth.js:48-66](https://github.com/animist-io/whale-island/blob/e5ee75a5b455d32218a248b9eedf86be20f82350/lib/eth.js#L48-L66 "Source code on GitHub")

Recovers address used to sign a message, which may be encoded in eth-lightwallet or web3.sign 
formats. (Will generate non-existent address if data signed and 'rawMsg' are not identical.

**Parameters**

-   `rawMsg` **String** : the endpoints currently broadcast pin
-   `signed` **Object or String** : a value signed by the callers account

Returns **String** account: hex prefixed public address of msg signer.

Returns **** undefined if ethereumjs-util throws an error during recovery.

# sendTx

[lib/eth.js:208-210](https://github.com/animist-io/whale-island/blob/e5ee75a5b455d32218a248b9eedf86be20f82350/lib/eth.js#L208-L210 "Source code on GitHub")

Prints client-signed tx to blockchain. A wrapper for web3 sendRawTransaction.

**Parameters**

-   `tx` **String** : a signed transaction

Returns **String** txHash of sendRawTransaction

# sendTxWhenAuthed

[lib/eth.js:221-293](https://github.com/animist-io/whale-island/blob/e5ee75a5b455d32218a248b9eedf86be20f82350/lib/eth.js#L221-L293 "Source code on GitHub")

Waits for auth tx to be mined then sends tx. Updates client's contract record with auth status when 
pending, successful, failed and saves signedTx transaction hash to record on success.

**Parameters**

-   `authTxHash` **String** : hash of pending presence verification tx sent by animist device
-   `signedTx` **String** : signed tx submittable w/ eth.sendRawTransaction
-   `address` **String** : the client account address
-   `cb` **Function** : optional callback for unit testing.
