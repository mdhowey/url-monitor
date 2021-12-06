/*
 * Helpers for various tasks
 */

// dependencies
var crypto = require('crypto');
var config = require('./config.js');

// conatiner for Helpers
var helpers = {};

// create a SHA256 hashedPasswrod
helpers.hash = function(str){
    if(typeof(str) == 'string' && str.length > 0){
        var hash = crypto.createHmac('sha256',config.hashingSecret).update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
};

// parse json string to object in all cases w/o throwing
helpers.parseJsonToObject = function(str){
    try{
        var obj = JSON.parse(str);
        return obj;
    }catch(e){
        return {};
    }
};

// export helpers
module.exports = helpers;
