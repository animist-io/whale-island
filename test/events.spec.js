

describe('Ethereum Contract Event Listeners', () => {

    describe('isValidDuration', ()=>{

    });

    describe('isValidContent', ()=>{

    });

    describe('isValidBroadcastEvent', ()=>{
        it('should validate broadcast contract events', ()=>{

        });

        it('should return false if channel uuid is malformed', ()=>{

        });

        it('should return false if content is invalid', ()=>{

        });

        it('should return false if duration is invalid', ()=>{

        });
    });

    describe('isValidProximityEvent', ()=>{

        it('should validate proximity contract events', ()=>{

        });

        it('should return false if account address malformed', ()=>{

        });

        it('should return false if contract address malformed', ()=>{

        });
    });

    describe('getLastSavedBlock', ()=>{

        it('should return the value of a DBs "lastBlock" rec', ()=>{

        });

        it('should return devices "genesis block" if DB is empty', ()=>{

        });
    });

    describe('saveBlock', ()=>{

        it('should create a "lastBlock rec if DB is empty', ()=>{

        });

        it('should update a DBs "lastBlock" rec', ()=>{

        })
    });

    describe('addProximityDetectionRequest', () => {
        it('should add event to the proximityEvents db', ()=>{

        })
    });

    describe('addBroadcast', () => {

        it('should start broadcasting the specified channel/content', ()=>{

        });

        it('should stop broadcasting request after specified duration', ()=>{

        });
    });

    describe('removeBroadcast', ()=>{

        it('should remove specified channel/content from broadcasts', ()=>{

        });

    });

    describe('startProximityDetectionRequestsFilter', ()=>{

        it('should begin saving proximity detection reqs for this node logged to the blockchain', ()=>{

        });

        it('should update the "lastBlock" record the proximityContracts DB after saving each request', ()=>{

        });     
    });

    describe('startBroadcastRequestsFilter', () => {

        it('should begin broadcasting any broadcast reqs for this node logge to the blockchain', ()=>{

        });

        it('should upate the "lastBlock" record of the broadcastContracts DB after each request', ()=>{

        });
    });
});