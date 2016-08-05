'use strict';
console.log('Loading CheckSslExpiry::');
console.log('Version 0.1');

var https = require('https');
var requestDataString = '';

/*
var request = https.get('https://s3.amazonaws.com/www.kylemunz.com/deploy.json', function(response) {
  response.on('data', function(chunkBuffer) {
    // var data is a chunk of data from response body
    requestDataString += chunkBuffer.toString();
  });
  response.on('end', function() {
    console.log("https file received");
    console.log(requestDataString);
  });
});
*/

var options = {
  host: 'www.oilandgasinvestor.com',
  port: 443,
  method: 'GET'
};

var req = https.request(options, function(res) {
  var cert=res.connection.getPeerCertificate();
  //console.log(cert);
  //cert=JSON.parse(cert);
  console.log(cert.valid_to);
});

req.end();

exports.handler = (event, context, callback) => {
    // TODO implement
    callback(null, 'Hello from Lambda');
};
