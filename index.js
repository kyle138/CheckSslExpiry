'use strict';
console.log('Loading CheckSslExpiry::');
console.log('Version 0.1');

//// Local only, this will be replaced by IAM Role in Lambda
var ddbOptions = require('./ddbOptions.json');
var aws = require('aws-sdk');
////


var checkSsl = require('check-ssl-expiration');
var ddb = new aws.DynamoDB(ddbOptions);

// var domains = [
//   'zeusintel.com',
//   'www.rextagstrategies.com',
//   'accounts.hartenergy.com',
// //  'report.hartenergynetwork.com',
//   'secure.hartenergynetwork.com',
//   'order.hartenergy.com',
//   'stratasadvisors.com',
//   'secure.oilandgasinvestor.com',
//   'hartenergy.com',
//   'store.hartenergy.com',
//   'www.oilandgasinvestor.com'
// ];

function onScan(err, data, callback) {
  if (err) {
    console.error("Unable to scan the table. Error JSON: ",JSON.stringify(err, null, 2));
  } else {
    console.log("Scan succeeded. Items returned: "+data.Count); //DEBUG
    data.Items.forEach(function(item) {
      console.log("Item: "+JSON.stringify(item, null, 2));  //DEBUG
    });
  }
}


function processDomain(element, index, array) {
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
