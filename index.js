'use strict';
console.log('Loading CheckSslExpiry::');
console.log('Version 1.2');

// The required
var checkSsl = require('check-ssl-expiration');
var aws = require('aws-sdk');
aws.config.update({region:'us-east-1'});
var ddb = new aws.DynamoDB();
var ses = new aws.SES();

// Config. Critical and Warning threshholds set in days.
// Retrieve from Lambda Environment variables or set default.
var crit = process.env.crit || 14;
var warn = process.env.warn || 21;
var toAdrs = process.env.toAdrs || "kmunz@hartenergy.com";
console.log(`crit: ${crit} warn: ${warn} toAdrs: ${toAdrs}`);   //DEBUG

// Globals
var totalItems=0;
var processedItems=0;

exports.handler = (event, context, callback) => {

  // Scans DynamoDB Table check-ssl-expiration_domains for list of domains to check.
  function getDomains(err, tableName, callback) {
    if (err) {
      console.error("Unable to get domains "+err);
      context.fail();
    } else if (!tableName) {
      console.error("getDomains::tableName is a required argument.");
      context.fail();
    } else {
      var params = {
        TableName: tableName
      };
      ddb.scan(params, onScan);
    }
  } //getDomains()

  // Handles results of ddb scan, sets totalItems for complete()
  function onScan(err, data, callback) {
    if (err) {
      console.error("Unable to scan the table. Error JSON: ",JSON.stringify(err, null, 2));
      context.fail();
    } else {
      console.log("Scan succeeded. Items returned: "+data.Count); //DEBUG
      totalItems=data.Count;
      data.Items.forEach(function(item) {
        getDomainExpiration(null, item, processDomain);
      });
    }
  } //onScan

  // Returns days remaining for requested domain's SSL/TLS certificate
  function getDomainExpiration(err, item, callback) {
    if (err) {
      console.error("Unable to getDomainExpiration. Error JSON: ",JSON.stringify(err, null, 2));
    } else {
      checkSsl(item.domain.S, 'days', function(err, remaining) {
        if (err) {
          console.error("Unable to check SSL: ",err);
          callback(err.code, item, null);
        } else {
        callback(null, item, remaining);
        }
      });
    }
  } //getDomainExpiration()

  // If days remaining is less than crit and status is not already CRITICAL, sets status to CRITICAL in ddb, sends email.
  // If days remaining is less than warn and status is not already WARNING, sets status to WARNING in ddb, sends email.
  // Else, if status is not already OK, sets status to OK and sends email.
  function processDomain(err, item, days, callback) {
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
    if(!item.hasOwnProperty('status')) item.status = {'S': 'Unknown'};
    if (err) {  // If there was an error with the https request
      console.error("processDomain error: ",err);
      updateParams.ExpressionAttributeValues = {
        ":newStatus":{"S":err}
      };
      updateStatus(null, updateParams, null, notifyEmail);
    } else {
      if (days<crit) {
        if (item.status.S != "CRITICAL") {
          updateParams.ExpressionAttributeValues = {
            ":newStatus":{"S":"CRITICAL"}
          };
          updateStatus(null, updateParams, days, notifyEmail);
        } else {
          complete();
        }
      } else if (days<warn) {
        if (item.status.S != "WARNING") {
          updateParams.ExpressionAttributeValues = {
            ":newStatus":{"S":"WARNING"}
          };
          updateStatus(null, updateParams, days, notifyEmail);
        } else {
          complete();
        }
      } else {
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
  } //processDomain()

  // Updates item.status in ddb for each domain.
  function updateStatus(err, params, days, callback) {
    if (err) {
      console.error("updateStatus Error: ",err);
      context.fail();
    } else {
      ddb.updateItem(params, function(err, data) {
        if (err) {
          console.error("ddb.updateItem Error: ",err, err.stack);
          context.fail();
        } else {
          if(typeof callback === 'function' && callback(null, params.Key.domain.S, data.Attributes.status.S, days, complete));
        }
      });
    }
  } //updateStatus()

  // Sends notification emails via SES for domains with a change in status.
  function notifyEmail(err, domain, status, days, callback) {
    if (err) {
      console.error("notifyEmail Error: ",err);
      context.fail();
    } else {
      //console.log("Email: "+JSON.stringify(params, null, 2));  //DEBUG
      console.log("Email: "+domain+" "+status+" "+days+" remaining.");
      var emailSubject = "SSL status for "+domain;
      var emailBody = "Domain: "+domain+"<br/>\r\nStatus: "+status+"<br/>\r\nExpires in: "+days+" days.<br/>\r\n";
      var emailParams = {
        Destination: {
              ToAddresses: [toAdrs]
        },
        Message: {
          Body: {
            Html: {
              Data: emailBody,
              Charset: 'UTF-8'
            }
          },
          Subject: {
            Data: emailSubject,
            Charset: 'UTF-8'
          }
        },
        ReplyToAddresses: ["webserveralerts@hartenergy.com"],
        ReturnPath: "webserveralerts@hartenergy.com",
        Source: "webserveralerts@hartenergy.com"
      };
      ses.sendEmail(emailParams,function(err, data) {
        if (err) {
          console.log("Email did not send."+err); //DEBUG
          context.fail('Error sending email:'+err+err.stack); //an error occurred with SES
          complete();
        } else {
          complete();
        }
      });
    }
  } //notifyEmail()

  // Keeps track of totalItems returned from DynamoDB onScan.
  // When processedItems==totalItems, calls context.succeed to shut Lambda down.
  function complete() {
    processedItems++;
    console.log("Processed domain "+processedItems+" of "+totalItems); //DEBUG
    if(processedItems==totalItems) {
      console.log("All domains processed, shut 'er down.'");
      callback(null, "EOL");  // End the Lambda
    }
  } //complete()

  // Output error information and end the Lambda
  function handleError(method, response) {
    var errorMessage = {
      lambdaFunctionName: context.functionName,
      eventTimeUTC: new Date().toUTCString(),
      methodName: method,
      error: response
    };

    console.log("errorMessage: "+JSON.stringify(errorMessage, null, 2)); //DEBUG

    // Load the DDB client so we can write to errorLogs
    const documentClient = new aws.DynamoDB.DocumentClient();

    // ttl value for DDB, item expires after 1 month
    var ttl = Math.floor(Date.now() / 1000)+2592000;

    // Prepare params for DDB put
    var params = {
      TableName: "errorLogs",
      Item: {
        ttl: ttl,
        data: errorMessage
      }
    };

    //Now everybody gonna know what you did wrong
    documentClient.put(params, function(err, data) {
      if (err) console.log("Unable to add DDB item: "+JSON.stringify(err, null, 2));
      complete();
    });
  } // End handleError

  //////PROCESS BEGINS HERE//////
  // Calls getDomains() to kick off the whole show
  getDomains(null, 'check-ssl-expiration_domains');

  //callback(null, 'Hello from Lambda');

};  // exports.handler
