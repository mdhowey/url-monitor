/*
 * Request handlers
 */

// dependencies
var _data = require('./data');
var helpers = require('./helpers')

// define handlers
var handlers = {};

// users
handlers.users = function(data,callback){
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        hundlers._users[data.method](data,callback);
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
                        'firstName' : 'firstName',
                        'lastName' : 'lastName',
                        'phone' : 'phone',
                        'password' : 'hashedPasswrod',
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
handlers._users.get = function(data,callback){

};

// users - put
handlers._users.put = function(data,callback){

};

// users - delete
handlers._users.delete = function(data,callback){

};

// ping handler
handlers.ping = function(data,callback){
    callback(200);
}

// not found handler (404)
handlers.notFound = function(data,callback){
    callback(404);
};

// export module
module.exports = handlers
