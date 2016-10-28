module.exports.Test = `

    contract Test {

        struct SignedBeacon {           
            uint8 v;                 
            bytes32 r;
            bytes32 s;
        }

        address public client;
        address public authorizedClient;
        uint counter;
        uint public state;
        bool public verified;
        bool messageDelivered;
        uint64 public timeVerified;
        SignedBeacon signedBeacon;

        function Test(){
            verified = true;
        }
        
        function advanceBlock(){
            counter++;
        }
        function getState() constant returns (uint val){
            return state;
        }
        function setState(uint val) public{
            state = val;
        }
        
        function getVerified() constant returns (bool status){
            return verified;
        }
        function setVerified(bool val) public {
            verified = val;
        }
        
        function getMessageDelivered() public constant returns (bool val){
            return messageDelivered;
        }
        function setMessageDelivered(bool val) public {
            messageDelivered = false;
        }
        
        function getTimeVerified() constant returns (uint time){
            return timeVerified;
        }
        function setTimeVerified(uint64 time) public {
            timeVerified = time;
        }

        function getClient() constant returns (address client){
            return client;
        }
        function setClient(address client_) public {
            client = client_;
        }

        function getAuthorizedClient( address client_) constant returns (address val){
            return authorizedClient;
        }
        function setAuthorizedClient( address client_) public{
            authorizedClient = client_;
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

        function isAuthorizedToReadMessage( address visitor, string uuid ) constant returns (bool result){
            if ( visitor == authorizedClient )
                return true;
            else
                return false;
        }

        function confirmMessageDelivery( address visitor, string uuid, uint64 time){
            if (visitor == authorizedClient )
                messageDelivered = true;
        }
    }`;

module.exports.AnimistMethods = `
    contract AnimistMethods {
        function verifyPresence(address visitor, uint64 time){}
        function submitSignedBeaconId(uint8 v, bytes32 r, bytes32 s){}
        function isAuthorizedToReadMessage( address visitor, string uuid ) constant returns (bool result){}
        function confirmMessageDelivery( address visitor, string uuid, uint64 time){}
    }`;


module.exports.AnimistEvent = `

    contract AnimistEvent {

        event LogPresenceVerificationRequest( address indexed node, address indexed account, address indexed contractAddress);
        event LogMessagePublicationRequest( address indexed node, string uuid, string message, uint64 expires, address contractAddress );
        event LogBeaconBroadcastRequest( address indexed node, string uuid, address contractAddress );

        // ------------------------------------------  Event wrappers ------------------------------------------------------
        function requestPresenceVerification(address node, address account, address contractAddress) {

            LogPresenceVerificationRequest(node, account, contractAddress);
        }

        function requestMessagePublication(address node, string uuid, string message, uint64 expires, address contractAddress ){

            LogMessagePublicationRequest(node, uuid, message, expires, contractAddress );
        }

        function requestBeaconBroadcast(address node, string uuid, address contractAddress ){

            LogBeaconBroadcastRequest( node, uuid, contractAddress );

        }

    }`;
