'use strict';
console.log('Loading CheckSslExpiry::');
console.log('Version 0.1');

var checkSsl = require('check-ssl-expiration');
//Aug  8 15:51:44 2017 GMT

var daysLeft = checkSsl('www.example.com', function(err, days) {
  if(err) {
    console.error(err);
  } else {
  console.log("days: "+days);
  }
});

/*
exports.handler = (event, context, callback) => {
    // TODO implement
    callback(null, 'Hello from Lambda');
};
*/
