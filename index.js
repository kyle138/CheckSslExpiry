'use strict';
console.log('Loading CheckSslExpiry::');
console.log('Version 0.4');

//// Local only, this will be replaced by IAM Role in Lambda
//var ddbOptions = require('./ddbOptions.json');
var aws = require('aws-sdk');
aws.config.update({region:'us-east-1'});
////

// The required
var checkSsl = require('check-ssl-expiration');
//var ddb = new aws.DynamoDB(ddbOptions);
var ddb = new aws.DynamoDB();
var ses = new aws.SES();

// Config. Critical and Warning threshholds set in days.
var crit=14;
var warn=21;

// Global
var totalItems=0;
var processedItems=0;

exports.handler = (event, context, callback) => {

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

  function getDomainExpiration(err, item, callback) {
    checkSsl(item.domain.S, 'days', function(err, remaining) {
      if (err) {
        console.error(err);
        context.fail();
      } else {
  //    console.log(item.domain.S+": "+remaining);
      callback(null, item, remaining);
      }
    });
  } //getDomainExpiration()

  function processDomain(err, item, days, callback) {
    if (err) {
      console.error(err);
      context.fail();
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
      if(!item.hasOwnProperty('status.S')) item.status = {'S': 'Unknown'};
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
  } //processDomain()

  function updateStatus(err, params, days, callback) {
  //  console.log("updateStatus callback: "+typeof callback); //DEBUG

    if (err) {
      console.error(err);
      context.fail();
    } else {
      ddb.updateItem(params, function(err, data) {
        if (err) {
          console.error(err, err.stack);
          context.fail();
        } else {
  //        console.log("Item updated("+params.Key.domain.S+"):"+JSON.stringify(data, null, 2));  //DEBUG
  //        console.log("updateStatus callback: "+typeof callback); //DEBUG
          if(typeof callback === 'function' && callback(null, params.Key.domain.S, data.Attributes.status.S, days, complete));
        }
      });
    }
  } //updateStatus()

  function notifyEmail(err, domain, status, days, callback) {
    if (err) {
      console.error(err);
      context.fail();
    } else {
      //console.log("Email: "+JSON.stringify(params, null, 2));  //DEBUG
      console.log("Email: "+domain+" "+status+" "+days+" remaining.");
      var emailSubject = "SSL status for "+domain;
      var emailBody = "Domain: "+domain+"<br/>\r\nStatus: "+status+"<br/>\r\nExpires in: "+days+" days.<br/>\r\n";
      var emailParams = {
        Destination: {
              ToAddresses: ["webserveralerts@hartenergy.com"]
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
        } else {
          console.log("Email sent."+data);  //DEBUG SES send successful
          complete();
        }
      });
    }
  } //notifyEmail()

  function complete() {
    processedItems++;
    console.log("processedItems: "+processedItems+" of "+totalItems); //DEBUG
    if(processedItems==totalItems) {
      console.log("Job well done, mate.");
      context.succeed(true);
    }
  } //complete()

  getDomains(null, 'check-ssl-expiration_domains');
  callback(null, 'Hello from Lambda');
};
