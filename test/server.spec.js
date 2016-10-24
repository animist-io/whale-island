'use strict'

describe('BLE Server', ()=>{

    describe('prepPublicationsOnLaunch', () => {

        it('should remove expired publications from the events DB');

        it('should correctly schedule the removal of existing publications in the DB');

        it('should ensure the publication set is correct: e2e');
    });

    describe('isUniqueUUID', ()=>{

        it('should return false if theres already a publication w/ same uuid')

        /*
            let uuid = mocks.broadcast_1.args.uuid;
            events.addPublication(mocks.broadcast_1);
            events.isValidUUID(uuid).should.be.false;
        */
        
    })

    describe('addPublication', () => {

        it('should create a bleno characteristic and add it the DBs publications list');
    
            /*chai.spy.on(bleno, 'disconnect');
        
            let expectedChannel = mocks.broadcast_1.args.uuid.replace(/-/g, '');
            let expectedMessage = new Buffer(mocks.broadcast_1.args.message);
            let broadcasts = events.addPublication(mocks.broadcast_1);
    
            let cb = (code, response) => {

                code.should.equal(config.codes.RESULT_SUCCESS);
                Buffer.isBuffer(response).should.be.true;
                response.equals(expectedMessage).should.be.true;

                setTimeout(() => {
                    bleno.disconnect.should.have.been.called();
                    done();
                }, 100 );
            }

            broadcasts[0].uuid.should.equal(expectedChannel); // Verify uuid
            broadcasts[0].onReadRequest(null, cb);            // Test callback*/  


        it('should schedule publication removal correctly');

            /*events.addPublication(mocks.broadcast_1);
            events._units.getBroadcasts().length.should.equal(1);

            setTimeout(() => {
                events._units.getBroadcasts().length.should.equal(0);
                done();
            }, 100)*/

        it('should update the broadcast');
        
    });

    describe('scheduleRemoval', () => {

        it( 'should delete the publication from the events DB');
        it( 'should update the broadcast after removal');
    });

    describe('updateBroadcast', () => {

        it('should call Bleno setServices with the correct set of default/requested characteristics');
        it('should call Bleno setServices with the default char set if eventsDB is empty');
    });

    describe('onAdvertisingStart', () => {

        it('should set up the publications correctly, start broadcasting, and begin filtering for events');

    });

});