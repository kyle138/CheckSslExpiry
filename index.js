'use strict';
console.log('Loading CheckSslExpiry::');
console.log('Version 0.1');

var moment = require('moment');
var https = require('https');

var now = moment();

var options = {
  host: 'www.oilandgasinvestor.com',
  port: 443,
  method: 'GET'
};

var req = https.request(options, function(res) {
  var cert=res.connection.getPeerCertificate();
  var expireDate = moment(cert.valid_to, "MMM  D HH:mm:ss YYYY GMT");
  var remaining = expireDate.diff(now, 'days');
  console.log(cert.valid_to);
  console.log("expireDate: "+expireDate);
  console.log("now: "+now);
  console.log("remaining: "+remaining);
});

req.end();

//Aug  8 15:51:44 2017 GMT

exports.handler = (event, context, callback) => {
    // TODO implement
    callback(null, 'Hello from Lambda');
};
