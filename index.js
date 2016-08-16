'use strict';
console.log('Loading CheckSslExpiry::');
console.log('Version 0.1');

var checkSsl = require('check-ssl-expiration');

var domains = [
  'zeusintel.com',
  'www.rextagstrategies.com',
  'accounts.hartenergy.com',
//  'report.hartenergynetwork.com',
  'secure.hartenergynetwork.com',
  'order.hartenergy.com',
  'stratasadvisors.com',
  'secure.oilandgasinvestor.com',
  'hartenergy.com',
  'store.hartenergy.com',
  'www.oilandgasinvestor.com'
];

domains.forEach(processDomains);

function processDomains(element, index, array) {
  //console.log(element);
  checkSsl(element, 'days', function(err, remaining) {
    if(err) {
      console.error(err);
    } else {
    console.log(element+": "+remaining);
    }
  });

}


/*
exports.handler = (event, context, callback) => {
    // TODO implement
    callback(null, 'Hello from Lambda');
};
*/
