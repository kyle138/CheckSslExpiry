'use strict';
// Version 0.0.2

var moment = require('moment');
var https = require('https');

module.exports = function(domain, unit, cb) {
  if(!domain) { // domain is required
    if(typeof cb === 'function' && cb("Error: No domain specified", null));
    return false;
  } else {
    if (unit != 'years' &&
        unit != 'months' &&
        unit != 'weeks' &&
        unit != 'days' &&
        unit != 'hours' &&
        unit != 'minutes' &&
        unit != 'seconds' &&
        unit != 'milliseconds') {
          unit='days';  //default to days remaining
    }
    var now = moment(); //now, as in RIGHT NOW
    var options = {
      host: domain,
      port: 443,
      method: 'GET'
    };
    var req = https.request(options, function(res) {
      var cert=res.connection.getPeerCertificate(); // TLS/SSL certificate
      var expireDate = moment(cert.valid_to, "MMM D HH:mm:ss YYYY GMT");  // That funky datetime format
      var remaining = expireDate.diff(now, unit); // Subtrack cert.valid_to from RIGHT NOW
      if(typeof cb === 'function' && cb(null, remaining));
      return remaining;
    });
    req.on('error', (e) => {  // Error in https request, such as invalid domain name
      if(typeof cb === 'function' && cb(e, null));
    });
    req.end();
  }
}
