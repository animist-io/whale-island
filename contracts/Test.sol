
// Test contract deployed by unit tests to validate mgmt of contract API endpoints.
contract Test {

    address client;
    uint state;
    bool verified;
    uint64 timeVerified;


    // ------------------- Getters --------------------------
    function getState() constant public returns (uint state){
        return state;
    }
    function getVerified() constant public returns (bool status){
        return verified;
    }
    function getTimeVerified() constant public returns (uint time){
        return timeVerified;
    }

    function getClient() constant public returns (address client){
        return client;
    }

    // ------------------- Setters --------------------------
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

    // ------------------- API --------------------------
    function verifyPresence(address newClient, uint64 time){
        client = newClient;
        timeVerified = time;
        state++;
    }
}