/*
 * server-related tasks
 */

// Dependencies
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');
var handlers = require('./handlers');
var helpers = require('./helpers');
var path = require('path');
var util = require('util');
var debug = util.debuglog('server');

// instantiate server module object
var server = {};

// instantiate http server
server.httpServer = http.createServer(function(req,res){
    server.unifiedServer(req,res);
});

// instantiate https server
server.httpsServerOptions = {
    'key' : fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
    'cert' : fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOptions,function(req,res){
    server.unifiedServer(req,res);
});

// all server logic for both http & httpsPort
server.unifiedServer = function(req,res){
    // get URL and parse interval
    var parsedUrl = url.parse(req.url,true);

    // get path from URL (untrimmed path)
    var path = parsedUrl.pathname;  // regex ???
    var trimmedPath = path.replace(/^\/+|\/+$/g,'');

    // get query string as object
    var queryStringObject = parsedUrl.query;

    // get HTTP method
    var method = req.method.toLowerCase();

    // get headers as object
    var headers = req.headers;

    // get payload, if any [payload: comes in as stream; stremas are built into node]
    var decoder = new StringDecoder('utf-8');
    var buffer = '';
    // data event is not always called
    req.on('data',function(data){
            buffer += decoder.write(data);
    });
    // end event is always called
    req.on('end',function(){
        buffer += decoder.end();

        // choose correct handler req should go to; default to 404
        var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

        // construct data object for handler
        var data = {
            'trimmedPath' : trimmedPath,
            'queryStringObject' : queryStringObject,
            'method' : method,
            'headers' : headers,
            'payload' : helpers.parseJsonToObject(buffer)
        };

        // route req to handler specified in router
        chosenHandler(data,function(statusCode,payload){
            // use status code called back by handler or default 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            // use payload called back by handler or default to {}
            payload = typeof(payload) == 'object' ? payload : {};

            // convert payload to string_decodervar
            var payloadString = JSON.stringify(payload);

            // return response
            // Content-Type is a header --> parse as JSON
            res.setHeader('Content-Type','application/json');
            res.writeHead(statusCode);
            res.end(payloadString);
            // response 200 --> green; other --> red
            if(statusCode === 200){
                debug('\x1b[32m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
            } else {
                debug('\x1b[31m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
            }
        });
    });
};

// define request router
server.router = {
 'ping' : handlers.ping,
 'users' : handlers.users,
 'tokens' : handlers.tokens,
 'checks' : handlers.checks
};

// server init script
server.init = function(){
    // Start http server
    server.httpServer.listen(config.httpPort,function(){
        console.log('\x1b[32m%s\x1b[0m',"The http server is listening on port "+config.httpPort);
    });
    // start https server
    server.httpsServer.listen(config.httpsPort,function(){
        console.log('\x1b[35m%s\x1b[0m',"The https server is listening on port "+config.httpsPort);
    });
};

// export server
module.exports = server;
