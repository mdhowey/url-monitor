/*
 * Primary file for the API
 */

 // Dependencies
 var http = require('http');
 var url = require('url');
 var StringDecoder = require('string_decoder').StringDecoder;
 var config = require('./config');

 // server sould respond to all requests with a string
 var server = http.createServer(function(req,res){

     // get URL and parse interval
     var parsedUrl = url.parse(req.url,true);

     // get path from URL (untrimmed path)
     var path = parsedUrl.pathname;  // regex ???
     var trimmedPath = path.replace(/^\/+|\/+$/g,'');

     // get query string as object
     var queryStringObject = parsedUrl.query;

     // get HTTP method
     var method = req.method.toUpperCase();

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
             'trimmedPath': trimmedPath,
             'queryStringObject': queryStringObject,
             'method': method,
             'headers': headers,
             'payload': buffer,
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
             // log data
             console.log(data);
         });
     });
 });

 // Start server at proper env.port
 server.listen(config.port,function(){
     console.log("The server is listening on port 3000 now");
 });

 // define handlers
 var handlers = {};

 // sample handler
 handlers.sample = function(data,callback){
     // callback http status code and payload object
     callback(406,{'name' : 'sample handler'});
 };

 // not found handler (404)
 handlers.notFound = function(data,callback){
     callback(404);
 };

 // define request router
 var router = {
     'sample' : handlers.sample,
 };
