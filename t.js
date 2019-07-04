Error.stackTraceLimit = Infinity;
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

// var req = require('request')
// req.debug = true
// require('request-debug')(req)
//var agent = require('http-ssh-agent')
var https = require('https')
const agent = require('../http-ssh-agent/index')

var sshstring = 'anurup@127.0.0.1:2225'
var sshoptions = {  password: 'h@ckf3st', port: 2225, scheme: 'http' }

var ssh = agent(sshstring, sshoptions)
var url = 'http://www.google.com'
//var url = 'http://neverssl.com'
// req(
// { url , agent: ssh, ciphers: 'DES-CBC3-SHA', headers: {
//       'Connection': 'keep-alive',
//       'transfer-encoding': 'chunked',
//       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36'
//
//     } },
// (err, res, b) => {
//   if (err) {
//     console.error('err', err)
//   }
//   //console.log('res', res)
//   console.log('b', b)
// });

var options = {
  host: 'www.google.com',
  port: 80,
  path: '/',
  agent: ssh
};

var req = https.request(options, function(res) {
  console.log('STATUS: ' + res.statusCode);
  console.log('HEADERS: ' + JSON.stringify(res.headers));
  res.setEncoding('utf8');
  res.on('data', function (chunk) {
    console.log('BODY: ' + chunk);
  });
});

req.on('error', function(e) {
  console.log('problem with request: ' + e.message);
});


req.end();
//
// https.get({
//   url,          // assuming the remote server is running on port 8080
//   // the host is resolved via ssh so 127.0.0.1 -> example.com
//            // simply pass the agent
// }, function(response) {
//   response.pipe(process.stdout)
// })
