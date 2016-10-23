module.exports.Test = `

    contract Test {

        struct SignedBeacon {           // EC signature of beacon-signal emitted by first node as a start signal. 
            uint8 v;                    // (See submitSignedBeaconId and validateReceivedBeacon methods below)
            bytes32 r;
            bytes32 s;
        }

        address public client;
        uint counter;
        uint public state;
        bool public verified = true;
        uint64 public timeVerified;
        SignedBeacon signedBeacon;

        function Test(){
            signedBeacon.v = 1;
            signedBeacon.r = bytes32(1);
            signedBeacon.s = bytes32(1);
        }

        function advanceBlock(){
            counter++;
        }

        /*function getR() constant returns (bytes32 r){
            bytes32 r = signedBeacon.r;
            return r;
        }*/

        function getState() constant returns (uint val){
            return state;
        }
        function getVerified() constant returns (bool status){
            return verified;
        }
        function getTimeVerified() constant returns (uint time){
            return timeVerified;
        }

        function getClient() constant returns (address client){
            return client;
        }
        
        function setVerified(bool val) public {
            verified = val;
        }
        
        function setState(uint val) public{
            state = val;
        }
        
        function setTimeVerified(uint64 time) public {
            timeVerified = time;
        }

        function setClient(address newClient) public {
            client = newClient;
        }
        
        function resetAll() public{
            verified = false;
            timeVerified = 0;
            client = address(0);
            state = 0;
        }
        
        function verifyPresence(address visitor, uint64 time){
            client = visitor;
            timeVerified = time;
            state++;
        }


        function submitSignedBeaconId( uint8 v, bytes32 r, bytes32 s) public {
            signedBeacon.v = v;
            signedBeacon.r = r;
            signedBeacon.s = s;
        }

        function receivedBeaconMatchesSignedBeacon( string receivedStartSignal, address signingNode ) constant returns (bool result){
            
            var signal = sha3(receivedStartSignal);
            var signer = ecrecover(signal, signedBeacon.v, signedBeacon.r, signedBeacon.s);

            if (signingNode == signer)
                return true;
            else
                return false;
        }
    }`;

module.exports.AnimistMethods = `
    contract AnimistMethods {
        function verifyPresence(address visitor, uint64 time){}
        function submitSignedBeaconId(uint8 v, bytes32 r, bytes32 s){}
    }`;


module.exports.AnimistEvent = `

    contract AnimistEvent {

        event LogPresenceVerificationRequest( address indexed node, address indexed account, address indexed contractAddress);
        event LogMessagePublicationRequest( address indexed node, string uuid, string message, uint64 expires);
        event LogBeaconBroadcastRequest( address indexed node, string uuid, address contractAddress );

        // ------------------------------------------  Event wrappers ------------------------------------------------------
        function requestPresenceVerification(address node, address account, address contractAddress) {

            LogPresenceVerificationRequest(node, account, contractAddress);
        }

        function requestMessagePublication(address node, string uuid, string message, uint64 expires){

            LogMessagePublicationRequest(node, uuid, message, expires);
        }

        function requestBeaconBroadcast(address node, string uuid, address contractAddress ){

            LogBeaconBroadcastRequest( node, uuid, contractAddress );

        }

    }`;
