'use strict';
console.log('Loading CheckSslExpiry::');
console.log('Version 0.1');

var checkSsl = require('check-ssl-expiration');
//Aug  8 15:51:44 2017 GMT

checkSsl('www.example.com', 'days', function(err, remaining) {
  if(err) {
    console.error(err);
  } else {
  console.log("days: "+remaining);
  }
});

/*
exports.handler = (event, context, callback) => {
    // TODO implement
    callback(null, 'Hello from Lambda');
};
*/
