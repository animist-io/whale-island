'use strict'

// ----------------------------------- Imports -----------------------------------------
// Local
let config = require('../lib/config');
const defs = require('../lib/characteristics');
const util = require('../lib/util');
const eth = require('../lib/eth');

// ----------------------------------- Constants ---------------------------------------

const codes = config.codes;

// ------------------------------ Characteristic Handlers --------------------------------

/**
 Publishes current time pin value. (Public: does not require a signed pin).     
 Read C40C94B3-D9FF-45A0-9A37-032D72E423A9
 @method onGetPin
 @returns {Buffer} pin: 32 character alpha-numeric string (resets every ~30 sec)
*/ 
const onGetPin = function(offset, callback ){
   let pin = util.getPin();
   callback(codes.RESULT_SUCCESS, new Buffer(pin));
};

/**
 Publishes current blockNumber. (Public: does not require a signed pin).    
 Read: C888866C-3499-4B80-B145-E1A61620F885
 @method onGetBlockNumber
 @returns {Buffer} blockNumber: JSON string repr. int value converted to string.
*/ 
const onGetBlockNumber = function(offset, callback){
    let block = JSON.stringify(eth.getBlockNumber());
    callback(codes.RESULT_SUCCESS, new Buffer(block));
}

/**
 Responds w/ some web3 data about a tx. (Public: does not require a signed pin).      
 Subscribe/write to: 03796948-4475-4E6F-812E-18807B28A84A
 @method onGetTxStatus
 @param {String} data: hex prefixed tx hash
 @returns {Number} code: init response is hex code callback. 0x00 on success or err. 
 @returns {Buffer} status: JSON object (or 'null' string) { blockNumber: int OR null, nonce: int, gas: int }
*/
const onGetTxStatus = function(data, offset, response, callback){
    let out; 
    let self = defs.getTxStatusCharacteristic;
    let req = util.parseTxHash(data);
    
    if (req.ok){

        callback(codes.RESULT_SUCCESS);
        
        eth.getTx(req.val)
            .then( tx => { 
                out = new Buffer(JSON.stringify(tx));
                setTimeout(() => self.updateValueCallback(out), 50); 
            })
            .catch( err => {
                out = new Buffer(JSON.stringify('null'));
                setTimeout(() => self.updateValueCallback(out), 50);  
            });         
    } else callback(req.val); 
}

/**
 Generates, saves and sends a new session id. ( Requires: valid SessionId ).    
 Subscribe/write to: 9BBA5055-57CA-4F78-BA61-52F4154382CF
 @method onGetNewSessionId
 @param {String} data: current endpoint pin value, signed by caller account.
 @returns {Number} code: init response is hex code callback. 0x00 on success or err. 
 @returns {Buffer} session: JSON object (or 'null' string) { sessionId: string, expires: int, account: address }
*/
const onGetNewSessionId = function(data, offset, response, callback ){

    let out; 
    let self = defs.getNewSessionIdCharacteristic;
    let req = util.parseSignedPin(data);
    
    if (req.ok){

        callback(codes.RESULT_SUCCESS);
        
        util.startSession({account: req.val})
            .then( session => { 
                out = new Buffer(JSON.stringify(session));
                setTimeout(() => self.updateValueCallback(out), 50); 
            })
            .catch( err => {
                out = new Buffer(JSON.stringify('null'));
                setTimeout(() => self.updateValueCallback(out), 50);  
            });         
    } else callback(req.val);    
}

/**
 Sends the transaction hash of a tx submitted in an atomic authAndSubmit 
 request. This is available once the AuthTx has been mined and caller's tx has
 been published to chain. Also returns authStatus data which may be 'pending' or
 'failed' if authTx is unmined or ran out of gas.    
 Subscribe/write to: 421522D1-C7EE-494C-A1E4-029BBE644E8D
 @method onGetSubmittedTxHash
 @param {String} data: current endpoint pin value, signed by caller account.
 @returns {Number} code: init response is hex code callback. 0x00 on success or err. 
 @returns {Buffer} txHash: JSON string, hash or 'null' on error 
*/ 
const onGetSubmittedTxHash = function(data, offset, response, callback){
    
    let client, out = {};   
    let pin = util.getPin();
    let self = defs.getSubmittedTxHashCharacteristic;
    let req = util.parseSignedPin(data);

    if (req.ok){

        callback(codes.RESULT_SUCCESS);
        client = eth.recover(pin, req.val);
        eth.db().get(client)
            .then( doc => {
                out.authStatus = doc.authStatus;
                out.authTxHash = doc.authTxHash;
                out.submittedTxHash = doc.submittedTxHash;
                out = new Buffer(JSON.stringify(out)); 
                setTimeout(() => self.updateValueCallback(out), 50);
            })
            .catch( err => {
                out = new Buffer(JSON.stringify('null'));
                setTimeout( () => self.updateValueCallback(out), 50); 
            });

    } else callback(req.val); 
}


/**
 * Sends contract code plus a session id / expiration in a series of packets. This handler
 * sends the first of these - onGetContractIndicate sends the rest as the client signals it can 
 * accept more.     
 * Subscribe/write to: BFA15C55-ED8F-47B4-BD6A-31280E98C7BA
 * @method onGetContract
 * @param {String} data: current endpoint pin value, signed by caller account.
 * @returns {Number} code: init response is hex code callback. 0x00 on success or err. 
 * @returns {Buffer} data: JSON object (or null string) contract data incl. code, session data.
*/ 
const onGetContractWrite = function(data, offset, response, callback ){

    let out;
    let self = defs.getContractCharacteristic;
    let pin = util.getPin();
    let req = util.parseSignedPin(data);

    if (req.ok){

        eth.getContract(pin, req.val)
            .then( util.startSession )
            .then( contract => {

                util.activateQueue();
                util.queueContract(contract);
                callback(codes.RESULT_SUCCESS);

                setTimeout(()=>{ 
                    out = util.deQueue();
                    self.updateValueCallback(out);
                }, 50);
            })
            .catch( error => { callback( error ) });     
    } else callback(req.val);               
};

/**
 Fetches contract referencing the caller account. Writes the contract code plus a session id / expiration 
 out to the client in a series of packets. This fn sends the first of these - onGetContractIndicate 
 sends the rest as the client signals it can accept more. (Uses a timeout per bleno/issues/170 ) 
 @method onGetContractIndicate
 @returns {Buffer} data: part of a JSONed contract object sitting in send queue. (see onGetContract)
 @returns {Buffer} eof: JSON string EOF after last packet is sent.
*/ 
const onGetContractIndicate = function(){
    
    let out;
    let self = defs.getContractCharacteristic;
    let eof = new Buffer(codes.EOF);

    if ( util.isQueueActive() ) {

        if ( util.queueLength() ){
            out = util.deQueue();
            setTimeout( () => self.updateValueCallback(out));
         
        } else {
            util.deactivateQueue();
            setTimeout( () => self.updateValueCallback(eof));
        }

    // After EOF
    } else return;
};

/**
 * Executes web3.eth.call on methods that use no gas and do not need to be signed. Sends result.
 * (Public: Does not require a signed pin).     
 * Subscribe/write to: 4506C117-0A27-4D90-94A1-08BB81B0738F
 * @method onCallMethod
 * @param {String} data: JSON stringified array w/form [hexString to, hexString code]
 * @returns {Number} code: init response is hex code callback. 0x00 on success or err.
 * @returns {Buffer} eof: JSON string of web3.eth.call result.
*/ 
const onCallTx = function(data, offset, response, callback){

    let out;
    let self = defs.callTxCharacteristic;
    let parsed = util.parseCall(data);

    if (parsed.ok){
        callback(codes.RESULT_SUCCESS);
        out = eth.callTx(parsed.val);
        out = new Buffer(JSON.stringify(out));
        setTimeout( () => self.updateValueCallback(out), 50); 

    } else callback(parsed.val)
}

/**
 * Sends tx as rawTransaction if tx signer's sessionId is valid. Will not submit if
 * an unstarted or pending authAndSubmit tx exists in the contractDB for this caller account.
 * (This endpoint is a convenience for processing non-authed method calls (including contract
 * deployments) and payments. It cannot be used for presence verification in combination 
 * with a separate call to authTx. Auth's must be done atomically using the authAndSubmit endpoint).    
 * Subscribe/write to: 3340BC2C-70AE-4E7A-BE24-8B2ED8E3ED06
 * @method onSubmitTx
 * @param {Object} data: {tx: signed method call, sessionId: animist session id}]
 * @returns {Number} code: init response is hex code callback. 0x00 on success or err. 
 * @returns {Buffer} submittedTxHash: hash of submitted transaction
*/
const onSubmitTx = function(data, offset, response, callback){
    let out, txHash
    let self = defs.submitTxCharacteristic;

    util.canSubmitTx(data)
        .then( tx => {
            callback(codes.RESULT_SUCCESS);
            txHash = eth.submitTx(tx.val);
            out = new Buffer(JSON.stringify(txHash));
            setTimeout( () => self.updateValueCallback(out), 50);   
        })
        .catch( err => {
            callback(err.val) ; // Maybe this shouldn't be a catch. eth.submitTx could throw.
        })
}

/**
 Locates contract event about the calling account and auths it ( e.g. prints a timestamped
 verification of callers presence to contract - see eth.authTx ). Responds w/ auth tx hash.         
 Subscribe/write to: 297E3B0A-F353-4531-9D44-3686CC8C4036 
 @method onAuthTx
 @param {String} pin: current endpoint pin value, signed by caller account.
 @returns {Number} code: init response is hex code callback. 0x00 on success or err. 
 @returns {Buffer} authTxHash: JSON string (or 'null' on error) transaction hash.
*/ 
const onAuthTx = function(data, offset, response, callback){
    
    let out;
    let pin = util.getPin();
    let parsedPin = util.parseSignedPin(data);
    let self = defs.authTxCharacteristic;
    
    if (parsedPin.ok){

        callback(codes.RESULT_SUCCESS);
        eth.authTx( pin, parsedPin.val )
            .then( txHash => {
                out = new Buffer(JSON.stringify(txHash));
                setTimeout( () => self.updateValueCallback(out), 50);   
            })
            .catch( err => { 
                out = new Buffer(JSON.stringify('null'));
                setTimeout( () => self.updateValueCallback(out), 50); 
            });

    } else callback(parsedPin.val);      
};

/**
 Gets contract, auths and passes signed tx and the auth hash to submitTxWhenAuthed. 
 Sends auth transaction receipt.      
 Subscribe/write to: 8D8577B9-E2F0-4750-BB82-421750D9BF86
 @param {object} data: JSON object { pin: signedPin, tx: signed functionTx }
 @returns {Number} code: init response is hex code callback. 0x00 on success or err. 
 @returns {Buffer} authTxHash: JSON string (or 'null' on error) transaction hash.
*/ 
const onAuthAndSubmitTx = function(data, offset, response, callback ){
    let out, client, parsedPin, parsedTx;
    let pin = util.getPin();
    let self = defs.authAndSubmitTxCharacteristic;

    parsedPin = util.parseSignedPin(data);
    client = eth.recover(pin, parsedPin.val);
    parsedTx = util.parseSignedTx(data, client );

    if (parsedPin.ok && parsedTx.ok){
        
        callback(codes.RESULT_SUCCESS);
        eth.authTx( pin, parsedPin.val )
            .then( authTxHash => {
                eth.submitTxWhenAuthed(authTxHash, parsedTx.val, client );
                out = new Buffer(JSON.stringify(authTxHash));
                setTimeout( () => self.updateValueCallback(out), 50);   
            })
            .catch( err => { 
                out = new Buffer(JSON.stringify('null'));
                setTimeout( () => self.updateValueCallback(out), 50); 
            });

    } else {
        (parsedPin.ok) 
            ? callback( parsedTx.val )
            : callback( parsedPin.val ) 
    }
}

// ---------------------------------- Export --------------------------------------------
module.exports = {
    onGetPin : onGetPin,
    onGetBlockNumber: onGetBlockNumber,
    onGetNewSessionId: onGetNewSessionId,
    onCallTx: onCallTx,
    onAuthTx : onAuthTx,
    onSubmitTx : onSubmitTx,
    onGetSubmittedTxHash : onGetSubmittedTxHash,
    onGetTxStatus : onGetTxStatus,
    onAuthAndSubmitTx : onAuthAndSubmitTx,
    onGetContractWrite : onGetContractWrite,
    onGetContractIndicate : onGetContractIndicate,
};