/*
 * Helpers for various tasks
 */

// dependencies
var crypto = require('crypto');
var config = require('./config.js');
var https = require('https');
var querystring = require('querystring');
var path = require('path');
var fs = require('fs');

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
    if(phone && msg){
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
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
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

// get string content of template
helpers.getTemplate = function(templateName,data,callback){
    templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
    data = typeof(data) == 'object' && data !== null ? data : {};
    if(templateName){
        var templatesDir = path.join(__dirname,'/../templates/');
        fs.readFile(templatesDir+templateName+'.html','utf8',function(err,str){
            if(!err && str && str.length > 0){
                // interpolate str
                var finalString = helpers.interpolate(str,data);
                callback(false,finalString);
            } else {
                callback('No template found');
            }
        });
    } else {
        callback('Invalid template name; cannot serve given template');
    }
};

// add universal header-footer to str and pass data obj to header-footer for interpolation
helpers.addUniversalTemplates = function(str,data,callback){
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    data = typeof(data) == 'object' && data !== null ? data : {};
    // get header
    helpers.getTemplate('_header',data,function(err,headerString){
        if(!err && headerString){
            // get footer
            helpers.getTemplate('_footer',data,function(err,footerString){
                if(!err && footerString){
                    var fullString = headerString+str+footerString;
                    callback(false,fullString);
                } else {
                    callback('Could not find footer template');
                }
            });
        } else {
            callback('Could not find header template')
        }
    });
}

// take given string of data obj and find/replace all keys within it
helpers.interpolate = function(str,data){
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    data = typeof(data) == 'object' && data !== null ? data : {};
    // add templateGlobals to data obj to be used anywhere
    for(var keyName in config.templateGlobals){
        if(config.templateGlobals.hasOwnProperty(keyName)){
            data['global.'+keyName] = config.templateGlobals[keyName];
        }
    }
    // for each key in data obj, insert val into str at corresponding place holder
    for(var key in data){
        if(data.hasOwnProperty(key) && typeof(data[key]) == 'string'){
            var replace = data[key];
            var find = '{'+key+'}';
            str = str.replace(find,replace);
        }
    }
    return str;
};

// get contents of static (public) assest
helpers.getStaticAsset = function(fileName,callback){
    fileName = typeof(fileName) == 'string' && fileName.length > 0 ? fileName : false;
    if(fileName){
        var publicDir = path.join(__dirname,'/../public/');
        fs.readFile(publicDir+fileName,function(err,data){
            if(!err && data){
                callback(false,data);
            } else {
                callback('NO file could be found');
            }
        });
    } else {
        callback('A valid file name was not Specificed');
    }
};

// export helpers
module.exports = helpers;
