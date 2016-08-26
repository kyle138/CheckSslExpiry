'use strict';
console.log('Loading CheckSslExpiry::');
console.log('Version 0.1');

//// Local only, this will be replaced by IAM Role in Lambda
var ddbOptions = require('./ddbOptions.json');
var aws = require('aws-sdk');
////

// The required
var checkSsl = require('check-ssl-expiration');
var ddb = new aws.DynamoDB(ddbOptions);

// Config
var crit=14;
var warn=21;

// Global
var totalItems=0;
var processedItems=0;

var params = {
  TableName: 'check-ssl-expiration_domains',
};
ddb.scan(params, onScan);

function onScan(err, data, callback) {
  if (err) {
    console.error("Unable to scan the table. Error JSON: ",JSON.stringify(err, null, 2));
  } else {
    console.log("Scan succeeded. Items returned: "+data.Count); //DEBUG
    totalItems=data.Count;
    data.Items.forEach(function(item) {
      getDomainExpiration(null, item, processDomain);
    });
  }
}

function getDomainExpiration(err, item, callback) {
  checkSsl(item.domain.S, 'days', function(err, remaining) {
    if (err) {
      console.error(err);
    } else {
//    console.log(item.domain.S+": "+remaining);
    callback(null, item, remaining);
    }
  });
}

function processDomain(err, item, days, callback) {
  if (err) {
    console.error(err);
  } else {
    var updateParams = {
      TableName: 'check-ssl-expiration_domains',
      Key:{
        "domain": item.domain
      },
      UpdateExpression: "SET #stat = :newStatus",
      ExpressionAttributeNames: {
        "#stat": "status"
      },
      ReturnValues:"UPDATED_NEW"
    };
    if (days<crit) {
//      console.log(item.domain.S+" status: "+item.status.S+": "+days); //DEBUG
      if (item.status.S != "CRITICAL") {
        updateParams.ExpressionAttributeValues = {
          ":newStatus":{"S":"CRITICAL"}
        };
        updateStatus(null, updateParams, days, notifyEmail);
      } else {
        complete();
      }
    } else if (days<warn) {
//      console.log(item.domain.S+" status: "+item.status.S+": "+days); //DEBUG
      if (item.status.S != "WARNING") {
        updateParams.ExpressionAttributeValues = {
          ":newStatus":{"S":"WARNING"}
        };
        updateStatus(null, updateParams, days, notifyEmail);
      } else {
        complete();
      }
    } else {
//      console.log(item.domain.S+" status: "+item.status.S+": "+days); //DEBUG
      if (item.status.S != "OK") {
        updateParams.ExpressionAttributeValues = {
          ":newStatus":{"S":"OK"}
        };
        updateStatus(null, updateParams, days, notifyEmail);
      } else {
        complete();
      }
    }
  }
}

function updateStatus(err, params, days, callback) {
//  console.log("updateStatus callback: "+typeof callback); //DEBUG

  if (err) {
    console.error(err);
  } else {
    ddb.updateItem(params, function(err, data) {
      if (err) {
        console.error(err, err.stack);
      } else {
//        console.log("Item updated("+params.Key.domain.S+"):"+JSON.stringify(data, null, 2));  //DEBUG
//        console.log("updateStatus callback: "+typeof callback); //DEBUG
        if(typeof callback === 'function' && callback(null, params.Key.domain.S, data.Attributes.status.S, days, complete));
      }
    });
  }
}

function notifyEmail(err, domain, status, days, callback) {
  if (err) {
    console.error(err);
  } else {
    //console.log("Email: "+JSON.stringify(params, null, 2));  //DEBUG
    console.log("Email: "+domain+" "+status+" "+days+" remaining.");
    complete();
  }
}

function complete() {
  processedItems++;
  console.log("processedItems: "+processedItems+" of "+totalItems); //DEBUG
  if(processedItems==totalItems) console.log("context.done");
}

/*
exports.handler = (event, context, callback) => {
    // TODO implement
    callback(null, 'Hello from Lambda');
};
*/
