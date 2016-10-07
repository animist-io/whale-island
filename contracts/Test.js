module.exports.Test = `

    contract Test {
        address public client;
        uint public state;
        bool public verified = true;
        uint64 public timeVerified;

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
        function verifyPresence(address newClient, uint64 time){
            client = newClient;
            timeVerified = time;
            state++;
        }
    }`;

module.exports.AnimistEvent = `

    contract AnimistEvent {

        // LogRegistration(node, account, contract)
        // node: the account address of the node targeted by this event
        // account: the user account the node will expect to interact with.
        // contract: the address of the contract node will invoke Animist API functions on.*/
        event LogRegistration( address indexed node, address indexed account, address indexed contractAddress);
        
        // LogBroadcast(node, channel, duration)
        // node: the account address of the node targeted by this event
        // channel: not sure. (a characteristic string though, right?)
        // duration: don't know. Default? 
        event LogBroadcast( address indexed node, uint indexed channel, uint indexed value);


        // Event wrappers 
        function register(address node, address account, address contractAddress) {
            LogRegistration(node, account, contractAddress);
        }

        function broadcast(address node, uint channel, uint val){
            LogBroadcast(node, channel, val);
        }
    }`;