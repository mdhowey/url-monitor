/*
 * Primary file for the API
 */

// dependencies
var server = require('./lib/server');
var workers = require('./lib/workers');

// declare app
var app = {};

// initialize (init) function
app.init = function(){
    // start server
    server.init();
    // start workers
    workers.init();
};

// execute function
app.init();

// export app
module.exports = app;
