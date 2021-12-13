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
var _logs = require('./logs');
var util = require('util');
var debug = util.debuglog('workers');

// instantiate workers object
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
                        ("Error reading originalCheckData");
                    }
                });
            });
        } else {
            debug(err);
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
        debug("Error: one of the checks is not properly formatted; flawed check is being skipped");
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
    // log outcome
    var timeOfCheck = Date.now();
    workers.log(originalCheckData,checkOutcome,state,alertWarranted,timeOfCheck);
    // update check data
    var newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;


    // save updates
    _data.update('checks',newCheckData.id,newCheckData,function(err){
        if(!err){
            // send new check data to next phase of proccessCheckOutcome
            if(alertWarranted){
                workers.alertUserToStatusChange(newCheckData);
            } else {
                debug("Check outcome unchanged; no alert needed")
            }
        } else {
            debug("Error: Saving check update failed");
        }
    });
};

// alert user to status change
workers.alertUserToStatusChange = function(newCheckData){
    var msg = 'Alert: Your check for '+newCheckData.method.toUpperCase()+' '+newCheckData.protocol+'://'+newCheckData.url+' is currently '+newCheckData.state;
    helpers.sendTwilioSms(newCheckData.userPhone,msg,function(err){
        if(!err){
            debug("Success: User was alerted to status change via SMS", msg);
        } else {
            debug("Error: Could not send SMS alert to user with state change in their check");
        }
    });
};

workers.log = function(originalCheckData,checkOutcome,state,alertWarranted,timeOfCheck){
    // form log _data
    var logData = {
        'check' : originalCheckData,
        'outcome' : checkOutcome,
        'state' : state,
        'alert' : alertWarranted,
        'time' : timeOfCheck
    };
    // convert data to querystring
    var logString = JSON.stringify(logData);
    // determine name of log fail
    var logFileName = originalCheckData.id;
    // append log string to failed
    _logs.append(logFileName,logString,function(err){
        if(!err) {
            debug("Logging to file succeeded");
        } else {
            debug("Logging to file failed");
        }
    });
};

// timer to execute worker-process
workers.loop = function(){
    setInterval(function(){
        workers.gatherAllChecks();
    },1000 * 60);
};

// rotate (compress) log files
workers.rotateLogs = function(){
    // list non-compressed log files in .logs/
    _logs.list(false,function(err,logs){
        if(!err && logs && logs.length > 0){
            logs.forEach(function(logName){
                // compress data to different file
                var logId = logName.replace('.log','');
                var newFileId = logId+'-'+Date.now();
                _logs.compress(logId,newFileId,function(err){
                    if(!err){
                        // truncate log
                        _logs.truncate(logId,function(err){
                            if(!err){
                                debug('Success truncating logFile');
                            } else {
                                debug('Error truncating logFile');
                            }
                        });
                    } else {
                        debug('Error compressing one of the log files',err);
                    }
                });
            });

        } else {
            debug('Error : could not find any logs to rotate');
        }
    });
}

// timer to execute log rotation process (every 24 hours)
workers.logRotationLoop = function(){
    setInterval(function(){
        workers.rotateLogs();
    },1000 * 60 * 60 * 24); // once a day --> 24 hours
}

// init function
workers.init = function() {
    // yellow --> workers are running
    console.log('\x1b[33m%s\x1b[0m','Background workers are running');
    // execute checks
    workers.gatherAllChecks();
    // invoke execution loop
    workers.loop();
    // compress all logs immediately
    workers.rotateLogs();
    // call compression loop --> logs will later be compressed
    workers.logRotationLoop();
};

// export workers
module.exports = workers;
