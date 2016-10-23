/* describe('isUniqueUUID', ()=>{

        after(() => events._units.clearBroadcasts() )

        it('should return true if uuid is valid', ()=> {
            let uuid = "C6FEDFFF-87EA-405D-95D7-C8B19B6A85F8";
            events.isValidUUID(uuid).should.be.true;
        });

        it('should return false if uuid is malformed', ()=> {
            let uuid = "12355641";
            events.isValidUUID(uuid).should.be.false;

        });

        it('should return false if theres already a broadcast w/ same uuid', ()=>{

            let uuid = mocks.broadcast_1.args.uuid;
            events.addPublication(mocks.broadcast_1);
            events.isValidUUID(uuid).should.be.false;

        })
    })*/

    /*describe('addPublication', () => {

        it('should create a bleno characteristic and add it to the characteristics array', (done)=>{
    
            chai.spy.on(bleno, 'disconnect');
        
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
            broadcasts[0].onReadRequest(null, cb);            // Test callback  

        });

        it('should stop broadcasting request after specified duration', (done)=> {

            events.addPublication(mocks.broadcast_1);
            events._units.getBroadcasts().length.should.equal(1);

            setTimeout(() => {
                events._units.getBroadcasts().length.should.equal(0);
                done();
            }, 100)

        });
    });*/