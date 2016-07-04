// Methods for CLI
// Resources: https://www.npmjs.com/package/cli-color
const clc = require('cli-color');

const red = clc.green.bold;
const warn = clc.yellow.bold;
const notice = clc.blue.bold;
const log = console.log;

exports.start = (server) => {

    log(red(`AnimistServer starting. . .`))
    log(notice(`service: `) + ` ${server.serviceId}`);
    log(notice(`location: ` ) + `lat: ${server.location.lat}, lng: ${server.location.lng}`);
};

exports.advertising = () => {
    log(warn('advertising'));
}


