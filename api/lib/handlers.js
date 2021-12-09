/*
 * Request handlers
 */

// dependencies
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');

// define handlers
var handlers = {};

// ping handler
handlers.ping = function(data,callback){
    callback(200);
}

// not found handler (404)
handlers.notFound = function(data,callback){
    callback(404);
};

// users
handlers.users = function(data,callback){
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._users[data.method](data,callback);
    } else {
        // 405 method not allowed
        callback(405);
    }
};

// users submethods container
handlers._users = {};

// users - post
// required data: firstName, lastName, phone, password, tosAgreement
// optional data: none
handlers._users.post = function(data,callback){
    // check all required fields are present
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.phone.trim().length > 0 ? data.payload.password.trim() : false;
    var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if(firstName && lastName && phone && password && tosAgreement){
        // check if user exists
        _data.read('users',phone,function(err,data){
            if(err){
                // hash password
                var hashedPassword = helpers.hash(password);
                // create user object
                if(hashedPassword) {
                    var userObject = {
                        'firstName' : firstName,
                        'lastName' : lastName,
                        'phone' : phone,
                        'hashedPassword' : hashedPassword,
                        'tosAgreement' : true
                    };
                    // store user
                    _data.create('users',phone,userObject,function(err){
                        if(!err) {
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500,{'Error' : 'Could not create the new user'});
                        }
                    });
                } else {
                    callback(500, {'Error' : 'Could not hash user\'s password'});
                }
            } else {
                // user exists
                callback(400,{'Error' : 'User with that phone already exists'});
            }
        });
    } else {
        callback(400,{'Error' : 'Missing required fields'});
    }
};

// users - get
// required data: phone
// option data: none
handlers._users.get = function(data,callback){
    // check that phone number is valid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone){
        // get token from headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        //verify given token from headers is valid
        handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
            if(tokenIsValid){
                // lookup the user
                _data.read('users',phone,function(err,data){
                    if(!err && data){
                        // remove hash before returning
                        delete data.hashedPassword;
                        callback(200,data);
                    } else {
                        callback(404);
                    }
                });
            } else {
                callback(403,{ 'Error' : 'Missing required token in header or token is invalid' });
            }
        });
    } else {
        callback(400, { 'Error' : 'Missing required field' });
    }
};

// users - put
// required data: phone
// optional data: firstName, lastName, password (at least one mus be specified)
handlers._users.put = function(data,callback){
    // check for required field
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    // check for optional fields
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.phone.trim().length > 0 ? data.payload.password.trim() : false;

    // error if phone is false
    if(phone){
        if(firstName || lastName || password) {
            // get token from headers
            var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
            //verify given token from headers is valid
            handlers._toekns.verifyToken(token,phone,function(tokenIsValid){
                if(tokenIsValid){
                    _data.read('users', phone,function(err,userData){
                        if(!err && userData){
                            // update necessary fields
                            if(firstName){
                                userData.firstName = firstName;
                            }
                            if(lastName){
                                userData.lastName = lastName;
                            }
                            if(password){
                                userData.hashedPassword = helpers.hash(password);
                            }
                            // persist and store new data
                            _data.update('users',phone,userData,function(err){
                                if(!err){
                                    callback(200);
                                } else {
                                    console.log(err);
                                    callback(500,{ 'Error' : 'Could not update the user' });
                                }
                            })
                        } else {
                            callback(400, { 'Error' : 'The specified user does not exist' });
                        }
                    });
                } else {
                    callback(403,{ 'Error' : 'Missing required token in header or token is invalid' });
                }
            });
            // lookup user
        } else {
            callback(400, {'Error' : 'Missing fields to update'});
        }
    } else {
        callback(400, {'Error' : 'Missing reaquired field'});
    }
};

// users - delete
// required field : phone
// @TODO cleanup all users data with user obj
handlers._users.delete = function(data,callback){
    // check phone number validity
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone){
        // get token from headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        //verify given token from headers is valid
        handlers._toekns.verifyToken(token,phone,function(tokenIsValid){
            if(tokenIsValid){
                // lookup the user
                _data.read('users',phone,function(err,data){
                    if(!err && data){
                        _data.delete('users',phone,function(err){
                            if(!err){
                                callback(200);
                            } else {
                                callback(500,{ 'Error' : 'Could not delete specified user' });
                            }
                        });
                    } else {
                        callback(400, { 'Error' : 'Could not find specified user' });
                    }
                });
            } else {
                callback(403,{ 'Error' : 'Missing required token in header or token is invalid' });
            }
        });
    } else {
        callback(400, { 'Error' : 'Missing required field' });
    }
};

// tokens
handlers.tokens = function(data,callback){
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._tokens[data.method](data,callback);
    } else {
        // 405 method not allowed
        callback(405);
    }
};

// container for token methods
handlers._tokens = {};

// tokens post
// required data: phone, password
// optional data: none
handlers._tokens.post = function(data,callback){
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.phone.trim().length > 0 ? data.payload.password.trim() : false;
    if(phone && password){
        // lookup user with phone nubmer
        _data.read('users',phone,function(err,userData){
            if(!err && userData){
                // hash sent password and compare to user object
                var hashedPassword = helpers.hash(password);
                if(hashedPassword == userData.hashedPassword){
                    // if valid, create new token; set expiration date for one hour
                    var tokenId = helpers.createRandomString(20);
                    var expires = Date.now() + 1000 * 60 * 60;
                    var tokenObject = {
                        'phone': phone,
                        'id': tokenId,
                        'expires': expires
                    };
                    // store token
                    _data.create('tokens',tokenId,tokenObject,function(err){
                        if(!err){
                            callback(200,tokenObject)
                        } else {
                            callback(500,{'Error' : 'Could not create new token'});
                        }
                    });
                } else {
                    callback(400,{'Error' : 'Incorrect password; password did not match'})
                }
            } else {
                callback(400,{'Error' : 'Could not find specified user'});
            }
        });

    } else {
        callback(400,{'Error' : 'Missing required fields'});
    }
};

// tokens get
// required data: id
// optional data: none
handlers._tokens.get = function(data,callback){
    // check id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
        // lookup the token
        _data.read('tokens',id,function(err,tokenData){
            if(!err && tokenData){
                callback(200,tokenData);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, { 'Error' : 'Missing required field' });
    }
};

// tokens put
// required fields: id, extend
// optional data: none
handlers._tokens.put = function(data,callback){
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
    var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
    if(id && extend){
        // lookup token
        _data.read('tokens',id,function(err,tokenData){
            if(!err && tokenData){
                // check and make sure token isn't expired
                if(tokenData.expires > Date.now()){
                    tokenData.expires = Date.now() + 1000 * 60 * 60;
                    // store update
                    _data.update('tokens',id,tokenData,function(err){
                        if(!err){
                            callback(200);
                        } else {
                            callback(500,{ 'Error' : 'Could not update token expiration' });
                        }
                    });
                } else {
                    callback(400,{ 'Error': 'Token is expired and cannot be extended' });
                }
            } else {
                callback(44,{'Error' : 'Specificed token does not exist'})
            }
        });
    } else {
        callback(400,{'Error' : 'Missing required field(s) or invalid field(s)'})
    }
};

// tokens delete
// required data: id
// optional data: none
handlers._tokens.delete = function(data,callback){
    // check id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
        // lookup the token
        _data.read('tokens',id,function(err,data){
            if(!err && data){
                _data.delete('tokens',id,function(err){
                    if(!err){
                        callback(200);
                    } else {
                        callback(500,{ 'Error' : 'Could not delete specified token' });
                    }
                });
            } else {
                callback(400, { 'Error' : 'Could not find specified token' });
            }
        });
    } else {
        callback(400, { 'Error' : 'Missing required field' });
    }
};

// verify if given token id is valid for given user
handlers._tokens.verifyToken = function(id,phone,callback){
    // lookup token
    _data.read('tokens',id,function(err,tokenData){
        if(!err && tokenData) {
            // check that token is for gien user and !expired
            if(tokenData.phone == phone && tokenData.expires > Date.now()){
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
};

// checks
handlers.checks = function(data,callback){
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._checks[data.method](data,callback);
    } else {
        // 405 method not allowed
        callback(405);
    }
};

// container for checks methods
handlers._checks = {};

// checks - post
// required data: protocol, url, method, successCodes, timeoutSeconds
// optional data: none
handlers._checks.post = function(data,callback){
    // validate inputs
    var protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
    if(protocol && url && method && successCodes && timeoutSeconds) {
        // get token from headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // lookup user with token
        _data.read('tokens',token,function(err,tokenData){
            if(!err && tokenData){
                var userPhone = tokenData.phone;
                // lookup userData
                _data.read('users',userPhone,function(err,userData){
                    if(!err && userData){
                        var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                        // verify user has less than maxChecks
                        if(userChecks.length < config.maxChecks){
                            // create random id for check
                            var checkId = helpers.createRandomString(20);
                            // create check obj, include user phone
                            var checkObject = {
                                'ID' : checkId,
                                'userPhone' : userPhone,
                                'protocol' : protocol,
                                'method' : method,
                                'successCodes' : successCodes,
                                'timeoutSeconds' : timeoutSeconds
                            };
                            // save object
                            _data.create('checks',checkId,checkObject,function(err){
                                if(!err) {
                                    // add check id to user's object
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);
                                    // save new user data
                                    _data.update('users',userPhone,userData,function(err){
                                        if(!err){
                                            // return data, check object
                                            callback(200,checkObject);
                                        } else {
                                            callback(500,{ 'Error' : 'Could not update user with new check'});
                                        }
                                    });
                                } else {
                                    callback(500,{ 'Error' : 'Could not create new check' });
                                }
                            });
                        } else {
                            callback(400,{ 'Error' : 'User is already using max number of checks ('+config.maxChecks+')' });
                        }
                    } else {
                        callback(403);
                    }
                });
            } else {
                callback(403);
            }
        });
    } else {
        callback(400,{ 'Error' : 'Missing required inputs or inputs invalid' });
    }
};



// export module
module.exports = handlers;
