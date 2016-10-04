// Methods for CLI
// Resources: https://www.npmjs.com/package/cli-color
const clc = require('cli-color');

const red = clc.green.bold;
const warn = clc.yellow.bold;
const notice = clc.blue.bold;
const log = console.log;

const environment = (process.env.TRAVIS) ? 'Testing' : 'Production';

exports.start = (server) => {

    log(red('AnimistServer starting. . .'))
    log(notice('service: ') + ` ${server.serviceId}`);
    log(notice('location: ') + `lat: ${server.location.lat}, lng: ${server.location.lng}`);
    log(notice('env: ') + environment);
};

exports.beacon = (beacon) => {
    log(red('AnimistServer starting. . .'))
    log(notice('uuid: ') + ` ${beacon.uuid}`);
    log(notice('PID: ') + ` ${beacon.pid}`);
    log(notice('env: ') + environment);
}

exports.advertising = () => {
    log(warn('Advertising: '));
}

exports.beaconerror = (err) => {
    log(red('Beacon Advertising Error: ' + err));
}


