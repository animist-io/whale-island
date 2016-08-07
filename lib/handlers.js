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
 Publishes current time pin value.   
 @property {Characteristic} Read C40C94B3-D9FF-45A0-9A37-032D72E423A9
 @property {Public} Access
 @method onGetPin
 @param callback Hex code 0x00 on success
 @returns {Buffer} JSON formatted 32 character alpha-numeric string (resets every ~30 sec)
*/ 
const onGetPin = function(offset, callback ){
   let pin = util.getPin();
   callback(codes.RESULT_SUCCESS, new Buffer(pin));
};

/**
 Publishes current blockNumber.   
 @property {Characteristic} Read C888866C-3499-4B80-B145-E1A61620F885
 @property {Public} Access 
 @method onGetBlockNumber
 @param callback Hex code 0x00 on success
 @returns {Buffer} JSON formatted string: "152..2"
*/ 
const onGetBlockNumber = function(offset, callback){
    let block = JSON.stringify(eth.getBlockNumber());
    callback(codes.RESULT_SUCCESS, new Buffer(block));
}

/**
 Responds w/ some web3 data about a tx.      
 @property {Characteristic} Subscribe 03796948-4475-4E6F-812E-18807B28A84A
 @property {Public} Access
 @method onGetTxStatus
 @param {Buffer} data: JSON formatted tx hash (hex prefixed)
 @param {Buffer} callback: init response is hex code . 0x00 on success or err. 
 @returns {Buffer} JSON formatted object { blockNumber: "150..1", nonce: "77", gas: "314..3" }
 @returns {Buffer} JSON formatted string "null" on error.
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
 Generates, saves and sends a new session id. ( Access requires signed pin ).    
 @property {Characteristic} Subscribe 9BBA5055-57CA-4F78-BA61-52F4154382CF
 @property {Pin} Access
 @method onGetNewSessionId
 @param {Buffer} data: JSON formatted pin value, signed by caller account.
 @param {Buffer} callback: init response is hex code . 0x00 on success or err. 
 @returns {Buffer} JSON formatted object { sessionId: "a34..4q', expires: '435...01', account: '0x78ef..a' }
 @returns {Buffer} JSON formatted string "null" on error.
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
 Sends the hash of a transaction sent in an atomic authAndSend request. This is available once 
 the AuthTx has been mined and caller's tx has been published to chain. Also returns authStatus 
 data which may be 'pending' or 'failed' if authTx is unmined or ran out of gas.    
 @property {Characteristic} Subscribe 421522D1-C7EE-494C-A1E4-029BBE644E8D
 @property {Pin} Access
 @method onGetSubmittedTxHash
 @param {Buffer} data: JSON formatted pin value, signed by caller account.
 @param {Buffer} callback: init response is hex code . 0x00 on success or err. 
 @returns {Buffer} JSON formatted string txhash: "0x7d34e..023" 
 @returns {Buffer} JSON formatted string "null" on error.
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
 * Begins sending contract code plus a session id / expiration out to the client in a series of packets. 
 * This method sends the first of these - onGetContractIndicate publishes the rest as the client signals 
 * it can accept more.  
 * @property {Characteristic} Subscribe BFA15C55-ED8F-47B4-BD6A-31280E98C7BA
 * @property {Pin} Access
 * @method onGetContract
 * @param {Buffer} data: JSON formatted pin value, signed by caller account.
 * @param {Buffer} callback: init response is hex code . 0x00 on success or err.
 * @returns {Buffer} JSON formatted object: {code: '0x5d3e..11', sessionId: '4ydw2..2', expires: '5732..1'}
*/ 
const onGetContract = function(data, offset, response, callback ){

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
 DeQueues and sends contract code packet. ( Access is automatic following onGetContract call )
 @method onGetContractIndicate
 @returns {Buffer} data: queued packet of JSON formatted contract object. (see onGetContract)
 @returns {Buffer} JSON formatted string "EOF" after last packet is sent.
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
 * Executes web3.eth.call on methods that use no gas and do not need to be signed.  
 * @property {Characteristic} Subscribe 4506C117-0A27-4D90-94A1-08BB81B0738F
 * @property {Public} Access
 * @method onCallMethod
 * @param {Buffer} data: JSON formatted array repr. "to" and "data" fields of web3 call: ["0x84..e", "0x453e..f"]
 * @param {Buffer} callback: init response is hex code . 0x00 on success or err. 
 * @returns {Buffer} JSON formatted string of web3.eth.call result.
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
 * a pending authAndSubmit tx exists in the contractDB for this caller account. 
 * (This endpoint is intended primarily as a convenience for processing non-authed method calls, 
 * including contract deployments and payments.)   
 * @property {Characteristic} Subscribe 3340BC2C-70AE-4E7A-BE24-8B2ED8E3ED06
 * @property {SessionId} Access
 * @method onSubmitTx
 * @param {Object} data: signed method call and sessionId {tx: "0x123d..", sessionId: "9tfh1..v"}]
 * @param {Buffer} callback: init response is hex code . 0x00 on success or err. 
 * @returns {Buffer} submittedTxHash: hash of submitted transaction
*/
const onSendTx = function(data, offset, response, callback){
    let out, txHash
    let self = defs.sendTxCharacteristic;

    util.canSendTx(data)
        .then( tx => {
            callback(codes.RESULT_SUCCESS);
            txHash = eth.sendTx(tx.val);
            out = new Buffer(JSON.stringify(txHash));
            setTimeout( () => self.updateValueCallback(out), 50);   
        })
        .catch( err => {
            callback(err.val) ; // Maybe this shouldn't be a catch. eth.sendTx could throw.
        })
}

/**
 Auths client by invoking their contract's "verifyPresence" method with the device account.         
 @method onAuthTx
 @property {Characteristic} Subscribe 297E3B0A-F353-4531-9D44-3686CC8C4036 
 @property {Pin} Access
 @param {Buffer} data: JSON formatted pin value, signed by caller account.
 @param {Buffer} callback: init response is hex code . 0x00 on success or err. 
 @returns {Buffer} JSON formatted string auth transaction hash.
 @returns {Buffer} JSON formatted string "null" on error.
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
 Auths client by invoking their contract's "verifyPresence" method with the device account. 
 Waits for auth to be mined and sends clients raw transaction. This endpoint provides a way of 
 authenticating and sending a transaction in a single step.        
 @property {Characteristic} Subscribe 8D8577B9-E2F0-4750-BB82-421750D9BF86
 @property {Pin} Access
 @param {Buffer} data: JSON formatted object { pin: {v: r: s:}, tx: "0x32a..2d" }
 @param {Buffer} callback: init response is hex code . 0x00 on success or err.
 @returns {Buffer} JSON formatted string repr. auth transaction hash
 @returns {Buffer} JSON formatted string "null" on error.
*/ 
const onAuthAndSendTx = function(data, offset, response, callback ){
    let out, client, parsedPin, parsedTx;
    let pin = util.getPin();
    let self = defs.authAndSendTxCharacteristic;

    parsedPin = util.parseSignedPin(data);
    client = eth.recover(pin, parsedPin.val);
    parsedTx = util.parseSignedTx(data, client );

    if (parsedPin.ok && parsedTx.ok){
        
        callback(codes.RESULT_SUCCESS);
        eth.authTx( pin, parsedPin.val )
            .then( authTxHash => {
                eth.sendTxWhenAuthed(authTxHash, parsedTx.val, client );
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
    onSendTx : onSendTx,
    onGetSubmittedTxHash : onGetSubmittedTxHash,
    onGetTxStatus : onGetTxStatus,
    onAuthAndSendTx : onAuthAndSendTx,
    onGetContract : onGetContract,
    onGetContractIndicate : onGetContractIndicate,
};