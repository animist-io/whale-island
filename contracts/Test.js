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