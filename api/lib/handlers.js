/*
 * Request handlers
 */

// dependencies
var _data = require('./data');
var helpers = require('./helpers')

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
                var hashedPasswrod = helpers.hash(password);
                // create user object
                if(hashedPasswrod) {
                    var userObject = {
                        'firstName' : firstName,
                        'lastName' : lastName,
                        'phone' : phone,
                        'password' : hashedPasswrod,
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
// @TODO set up auth so users can only access their own objects, not other users' objects
handlers._users.get = function(data,callback){
    // check that phone number is valid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone){
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
        callback(400, { 'Error' : 'Missing required field' });
    }
};

// users - put
// required data: phone
// optional data: firstName, lastName, password (at least one mus be specified)
// @TODO set up auth so users can only update their own object, not other users' objects
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
            // lookup user
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
            callback(400, {'Error' : 'Missing fields to update'});
        }
    } else {
        callback(400, {'Error' : 'Missing reaquired field'});
    }
};

// users - delete
// required field : phone
// @TODO only auth'd user can delte thier own obj
// @TODO cleanup all users data with user obj
handlers._users.delete = function(data,callback){
    // check phone number validity
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone){
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
        callback(400, { 'Error' : 'Missing required field' });
    }
};



// export module
module.exports = handlers;
