#!/usr/bin/env node
// This file is the source for magnet, a program to search for torrents.
// This program is available at <https://github.com/lucasem/magnet>
// Copyright (C) 2016, 2017  Lucas E. Morales <lucas@lucasem.com>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

process.title = 'magnet'

const minimist = require('minimist')
const request = require('request')
require('request-debug')(request);
const cheerio = require('cheerio')
//const agent = require('http-ssh-agent')
const agent = require('../http-ssh-agent/index')
const fs = require('fs')

const version = "magnet version: 0.1.1"
const help = `
Usage: magnet [--tpb] [--leet] [--ssh [--user username] [--pass password] [--key keyfilepath]] [--rows=N] query [index [-- pargs]]
       magnet [-v | --version]
       magnet [-h | --help]

Options:
  --tpb               Use thepiratebay.org [default]
  --leet              Use 1337x.to
  --ssh               Send request via ssh ( in case torrent sites are blocked in your region ). If no ssh options are specified, it will look for options in ssh_
  --host host         ssh host [ defaults to 127.0.0.1 ]
  --port port         ssh port [ defaults to 22 ]
  --user username     ssh username
  --pass password     ssh password
  --key keyfilepath   identity key file
  query               Search query
  index               Gets the magnet link for a particular item
  --rows=N            Number of query results to show
     --               Sends the magnet link to peerflix
  pargs               Arguments for peerflix (requires -p)
`

const baseUrls =
  {
    'tpb'  : 'https://thepiratebay.org',
    'leet' : 'https://1337x.to'
  }

const rowHandlers =
  {
     'tpb' : (rows) => {
        handle(rows)
     },
     'leet': (rows) => {
       var p = new Promise(function(resolve, reject) {
        	// Do async job
          request.get(options, function(err, resp, body) {
              if (err) {
                  reject(err);
              } else {
                  resolve(JSON.parse(body));
              }
          })
      })
     }
  }

const handlers =
 {
    'tpb'  :  ($, rows) => {
      $('tr>td:nth-child(2)', 'table#searchResult').filter((i) => min <= i && i <= max).each((i, row) => {
        rows[i] = {
          name:   $('.detName>a', row).text(),
          url:    $('a[href^=magnet]', row).attr('href')
        }
      })
      rowHandlers['tpb'](rows)
    },
    'leet' : ($, rows) => {
      $('tr>td:nth-child(1)', 'table.table-list').filter((i) => min <= i && i <= max).each((i, row) => {
        rows[i] = {
          name:   $('a:nth-child(2)', row).text(),
          url:    $('a:nth-child(2)', row).attr('href')
        }
      })
      rowHandlers['leet'][rows]
    }

 }

let argv = minimist(process.argv.slice(2), {'--': true})

if (argv.version || argv.v) {
  console.log(version)
  process.exit(0)
}
if (argv.help || argv.h || !argv.tpb && !argv.leet && argv._.length < 1) {
  console.log(help)
  process.exit(0)
}
console.log('argv', argv)


// get base url
const baseUrl = getbaseurl(argv)
const reqUrl = baseUrl + "/search/"

var urlKey = undefined
//  check if ssh is enabled
var ssh = undefined

var requestObject = { gzip: true }

if (typeof argv.ssh !== 'undefined' && argv.ssh) {
  ssh = getsshobject(argv)
}

// get query
const query = argv._[0]
if (!query) {
  console.log(help)
  process.exit(0)
}
console.log('query', query);
const url = geturl(reqUrl + query, argv)
const max = argv._[1] || argv.rows || 5
const min = argv._[1] || 1

function handle(rows) {
  if (argv._.length < 2) {
    for (const [index, row] of rows.entries()) {
      process.stdout.write(`${index+1}: ${row.name}\n`)
    }
  } else {
    const magnet = rows[0].url
    if (process.argv.indexOf('--') != -1) {
      let pargs = [magnet]
      pargs.push(...argv['--'])
      require('child_process').spawn('peerflix', pargs, { stdio: 'inherit' })
    } else {
      process.stdout.write(`${magnet}\n`)
    }
  }
}

function geturl(requrl, argv) {
  var url = requrl

  if (argv.leet) {
    url = requrl.split(' ').join('+') + "/1/"

  }

  console.log('url', url);
  return url
}

function getsshobject(argv) {
  var sshobject

  if(argv.user) {
    var host = argv.host ? argv.host : '127.0.0.1'
    var port = argv.port ? argv.port : 2225
    var sshstring = `${argv.user}@${host}:2225`
    console.log('sshstring', sshstring)
    var sshoptions = {
      //debug: console.log,
      password: 'h@ckf3st' }

    sshoptions['port'] = port

    if (argv.key) {
      sshoptions['privateKey'] = argv.key
    }

    if (argv.pass) {
      sshoptions['password'] = argv.pass
    }
    console.log('sshoptions', sshoptions)
    sshobject = agent(sshstring, sshoptions)
  }

  return sshobject
}

function getbaseurl(argv) {
  var baseurl
  var baseurl_keys = Object.keys(baseUrls)
  baseurl_keys.forEach(function(k) {
    if (typeof argv[k] !== 'undefined' && argv[k]) {
      urlKey = k;
      baseurl = baseUrls[k]
    }
  })
  return baseurl
}

requestObject['url'] = url

if (typeof ssh !== 'undefined') {
  requestObject['agent'] = ssh
}

console.log('requestObject', requestObject)

request(requestObject, (error, response, body) => {
  console.log('in request callback')
  if (error) {
    console.error(error)
    return
  }
  let $ = cheerio.load(body)
  let rows = []
  handlers[urlKey]($, rows)
})
