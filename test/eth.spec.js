let config = require('../lib/config.js');
const eth = require('../lib/eth.js')
const account = require('../test/mocks/wallet.js');

const chai = require('chai');
const spies = require('chai-spies');
const expect = chai.expect;

chai.use(spies);