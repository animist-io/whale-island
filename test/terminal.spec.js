const terminal = require('../lib/terminal.js')

describe('Terminal', () => {
    let beacon = { 
        uuid: '12345', 
        pid: '12345'
    }

    it('methods should compile and run w/out crashing', ()=>{
        terminal._units.suppressLogs()
        
        terminal.start()
        terminal.beacon(beacon)
        terminal.advertising()
        terminal.beaconError('problem')
    });
});