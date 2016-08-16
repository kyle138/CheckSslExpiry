# check-ssl-expiration
NPM package to check given domain's SSL/TLS certificate and return time left until expiration.

## Install
npm install check-ssl-expiration --save

## Usage
check-ssl-expiration(domain, unit, callback)

#### domain
www.example.com 
(Do not include https:// or path)

#### unit
years, months, weeks, **days**, hours, minutes, or seconds

## Example
```javascript
var cse = require('check-ssl-expiration');

cse('www.example.com', 'days', function(err, remaining) {
  if(err) {
    console.error(err);
  } else {
    console.log("remaining: "+remaining);
  }
});
// remaining: 837

cse('www.example.com', 'months', function(err, remaining) {
  if(err) {
    console.error(err);
  } else {
    console.log("remaining: "+remaining);
  }
});
// remaining: 27
```
