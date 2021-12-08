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

// create string of random alphanumeric chars of a given length
helpers.createRandomString = function(strLength){
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
    if(strLength){
        var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        // initialize string
        var str = '';
        for(i = 1; i <= strLength; i++){
            // get random char from possibleCharacters
            var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
            // append char to str
            str+=randomCharacter;
        }
        return str;

    } else {
        return false;
    }
};

// export helpers
module.exports = helpers;
