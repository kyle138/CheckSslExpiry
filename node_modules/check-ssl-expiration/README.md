# check-ssl-expiration
NPM package to check given domain's SSL/TLS certificate and return days left until expiration.

## Install
npm install check-ssl-expiration --save

## Usage
```javascript
var cse = require('check-ssl-expiration');

cse('www.google.com'); //80
cse('www.example.com'); //841
cse('bananas'); //[Error: getaddrinfo ENOTFOUND bananas bananas:443]
```
