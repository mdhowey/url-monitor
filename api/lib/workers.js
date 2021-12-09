/*
 * worker-related tasks
 */

// dependencies
var path = require('path');
var fs = require('fs');
var _data = require('./data');
var http = require('http');
var https = require('https');
var helpers = require('./helpers');
var url = require('url');

// instantiate worker object
var workers = {};

// lookup all check, get data, send data to validator
workers.gatherAllChecks = function() {
    // get all checks
    _data.list('checks',function(err,checks){
        if(!err && checks && checks.length > 0){
            checks.forEach(function(check){
                // read checkData
                _data.read('checks',check,function(err,originalCheckData){
                    if(!err && originalCheckData) {
                        // pass to check validator; let function continue or break with error
                        workers.validateCheckData(originalCheckData);
                    } else {
                        console.log("Error reading originalCheckData");
                    }
                });
            });
        } else {
            console.log("Error: Could not find any checks to process");
        }
    });
};

// sanity-check checkData
workers.validateCheckData = function(originalCheckData){
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http','https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' &&  ['post','get','put','delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;
    // set keys that may not be set (if it is first time workers have seen key)
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up','down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;
    // if all checks pass, pass data along
    if(originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.url &&
    originalCheckData.method &&
    originalCheckData.successCodes &&
    originalCheckData.timeoutSeconds){
        workers.performCheck(originalCheckData);
    } else {
        console.log("Error: one of the checks is not properly formatted; flawed check is being skipped");
    }
};

// perform check, send originalCheckData and result to next part of process
workers.performCheck = function(originalCheckData){
    // prepare initial check outcome
    var checkOutcome = {
        'error' : false,
        'responseCode' : false
    };
    // log that result has not been sent
    var outcomeSent = false;
    // parse hostname and path from originalCheckData
    var parsedUrl = url.parse(originalCheckData.protocol+'://'+originalCheckData.url,true);
    var hostName = parsedUrl.hostname;
    var path = parsedUrl.path; // using path, not "pathname" --> we want querystring
    //construct req
    var requestDetails = {
        'protocol' : originalCheckData.protocol+':',
        'hostname' : hostName,
        'method' : originalCheckData.method.toUpperCase(),
        'path' : path,
        'timeout' : originalCheckData.timeoutSeconds * 1000 // key looking for milliseconds
    };
    // instsantiate the req object (http || https module)
    var _moduleToUse = originalCheckData.protocol == 'http' ? http : https; // module asigned in dependencies above
    var req = _moduleToUse.request(requestDetails,function(res){
        // grab sent req status
        var status = res.statusCode;
        // update check result and pass along data
        checkOutcome.responseCode = status;
        if(!outcomeSent){
            workers.proccessCheckOutcome(originalCheckData,checkOutcome);
            outcomeSent = true;
        }
    });
    // bind to error event so it doesn't get thrown
    req.on('error',function(e){
        // update checkOutcome and pass along data
        checkOutcome.error = {
            'error' : true,
            'value' : e
        };
        if(!outcomeSent){
            workers.proccessCheckOutcome(originalCheckData,checkOutcome);
            outcomeSent = true;
        };
    });
    // bind to timeout event
    req.on('timeout',function(e){
        // update checkOutcome and pass along data
        checkOutcome.error = {
            'error' : true,
            'value' : 'timeout'
        };
        if(!outcomeSent){
            workers.proccessCheckOutcome(originalCheckData,checkOutcome);
            outcomeSent = true;
        };
    });
    // end req --> req is sent here
    req.end()
};

// process checkOutcome and update checkData as needed; if needed, trigger user alert
// special logic for first-time check; won't trigger user alert
workers.proccessCheckOutcome = function(originalCheckData,checkOutcome){
    // determine if check is 'up' or 'down' --> no error, no timeout, one of user successCodes
    var state = !checkOutcome && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';
    // determine if alert is needed --> not default false, last recorded state has changed (i.e.- changing from 'up' to 'down' or 'down' to 'up')
    var alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;
    // update check data
    var newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = Date.now();
    // save updates
    _data.update('checks',newCheckData.id,newCheckData,function(err){
        if(!err){
            // send new check data to next phase of proccessCheckOutcome
            if(alertWarranted){
                workers.alertUserToStatusChange(newCheckData);
            } else {
                console.log("checkOutcome unchanged; no alert needed")
            }
        } else {
            console.log("Error: Saving check update failed");
        }
    });
};

// alert user to status change
workers.alertUserToStatusChange = function(newCheckData){
    var msg = 'Alert: Your check for '+newCheckData.method.toUpperCase()+' '+newCheckData.protocol+'://'+newCheckData.url+' is currently '+newCheckData.state;
    helpers.sendTwilioSms(newCheckData.userPhone,msg,function(err){
        if(!err){
            console.log("Success: User was alerted to status change via SMS", msg);
        } else {
            console.log("Error: Could not send SMS alert to user with state change in their check");
        }
    });
};

// timer to execute worker-process
workers.loop = function(){
    setInterval(function(){
        workers.gatherAllChecks();
    },1000 * 60);
};

// init function
workers.init = function() {
    // execute checks
    workers.gatherAllChecks();
    // invoke execution loop
    workers.loop();
};

// export workers
module.exports = workers;
