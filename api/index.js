/*
 * Primary file for the API
 */

 // Dependencies
 var http = require('http');
 var https = require('https');
 var url = require('url');
 var StringDecoder = require('string_decoder').StringDecoder;
 var config = require('./lib/config');
 var fs = require('fs');
 var handlers = require('./lib/handlers');
 var helpers = require('./lib/helpers');

 // instantiate http server
 var httpServer = http.createServer(function(req,res){
     unifiedServer(req,res);
 });

 // Start http server at proper currentEnvironment.port (staging || production)
 httpServer.listen(config.httpPort,function(){
     console.log("The http server is listening on port "+config.httpPort);
 });

 // instantiate https server
 var httpsServerOptions = {
     'key' : fs.readFileSync('./https/key.pem'),
     'cert' : fs.readFileSync('./https/cert.pem')
 };
 var httpsServer = https.createServer(httpsServerOptions,function(req,res){
     unifiedServer(req,res);
 });

 // start https server
 httpsServer.listen(config.httpsPort,function(){
     console.log("The https server is listening on port "+config.httpsPort);
 });

 // all server logic for both http & httpsPort
 var unifiedServer = function(req,res){
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
         var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

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
             // logger
             console.log(trimmedPath,statusCode);
         });
     });
 };

 // define request router
 var router = {
     'ping' : handlers.ping,
     'users' : handlers.users,
     'tokens' : handlers.tokens
 };
