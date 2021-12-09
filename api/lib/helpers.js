/*
 * Helpers for various tasks
 */

// dependencies
var crypto = require('crypto');
var config = require('./config.js');
var https = require('https');
var querystring = require('querystring');

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

// send sms message via Twilio
helpers.sendTwilioSms = function(phone,msg,callback){
    // validate params
    phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
    if(phone && msg) {
        // config req payload for payload
        var payload = {
            'From' : config.twilio.fromPhone,
            'To' : '+1'+phone,
            'Body' : msg
        };
        // stringify payload
        var stringPayload = querystring.stringify(payload);
        // config req details
        var requestDetails = {
            'protocol' : 'https:',
            'hostname' : 'api.twilio.com',
            'method' : 'POST',
            'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
            'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
            'headers' : {
                'Content-Type' : 'application/x-www-form-urlenconded',
                'Content-Length' : Buffer.byteLength(stringPayload)
            }
        };
        // instantiate req object
        var req = https.request(requestDetails,function(res){
            // grab status code of req
            var status = res.statusCode;
            // callback successfully if req went through
            if(status == 200 || status == 201){
                callback(false);
            } else {
                callback('Status code returned: '+status);
            }
        });
        // bind to error event so it doesn't get throw
        req.on('error',function(e){
            callback(e);
        });
        // add payload to req
        req.write(stringPayload);
        // end req --> req is actually sent here
        req.end();
    } else {
        callback('Given params were missing or invalid');
    }
};

// export helpers
module.exports = helpers;
