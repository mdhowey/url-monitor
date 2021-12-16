/*
 * frontend logic for app
 *
 */

// frontend app container
var app = {};

// config
app.config = {
    'sessionToken' : false,
};

// AJAX client (for RESTApi)
app.client = {};

// api call interface
app.client.request = function(headers,path,method,queryStringObject,payload,callback){
    // set defaults for all params
    headers = typeof(headers) == 'object' && headers !== null ? headers : {};
    path = typeof(path) == 'string' ? path : '/';
    method = typeof(method) == 'string' && ['POST','GET','PUT','DELETE'].indexOf(method) > -1 ? method.toUpperCase() : 'GET';
    queryStringObject = typeof(queryStringObject) == 'object' && queryStringObject !== null ? queryStringObject : {};
    payload = typeof(payload) == 'object' && payload !== null ? payload : {};
    // not typical sanity check of callback; client should accept req w/ || w/o callback
    callback = typeof(callback) == 'function' ? callback : false;

    // add each querystring param to path
    var requestUrl = path+'?';
    var counter = 0;
    for(var queryKey in queryStringObject){
        if(queryStringObject.hasOwnProperty(queryKey)){
            counter++;
            // if querystring param has been added, prepend new querystrings w/ &
            if(counter > 1){
                requestUrl+='&';
            }
            // add key val
            requestUrl+=queryKey+'='+queryStringObject[queryKey];
        }

    }
    // form http req as type JSON
    var xhr = new XMLHttpRequest();
    xhr.open(method,requestUrl,true);
    // set headers
    xhr.setRequestHeader("Content-Type","application/json");
    // add each header to req
    for(var headerKey in headers){
        if(headers.hasOwnProperty(headerKey)){
            xhr.setRequestHeader(headerKey,headers[headerKey]);
        }
    }
    // if(sessionToken) --> add as header
    if(app.config.sessionToken){
        xhr.setRequestHeader("token",app.config.sessionToken.id);
    }
    // when req returned, handle res
    xhr.onreadystatechange = function(){
        if(xhr.readyState == XMLHttpRequest.DONE){
            var statusCode = xhr.status;
            var responseReturned = xhr.responseText;
            // client callback if requested
            if(callback){
                try{
                    var parsedResponse = JSON.parse(responseReturned);
                    callback(statusCode,parsedResponse);
                } catch(e) {
                    callback(statusCode,false);
                }
            }
        }
    }
    // send payload as JSON
    var payloadString = JSON.stringify(payload);
    xhr.send(payloadString);
};

// bind logout button
app.bindLogoutButton = function(){
    document.getElementById("logoutButton").addEventListener("click", function(e){
        // stop from redirecting
        e.preventDefault();
        // log out user
        app.logUserOut();
    });
};

// log out user
app.logUserOut = function(){
    // get current token id
    var tokenId = typeof(app.config.sessionToken.id) == 'string' ? app.config.sessionToken.id : false;
    //send current token to tokens endpoint for deletion
    var queryStringObject = {
        'id' : tokenId
    };
    app.client.request(undefined,'api/tokens','DELETE',queryStringObject,undefined,function(statusCode,responsePayload){
        // set app.config token to false
        app.setSessionToken(false);
        // redirect user to logged out page
        window.location = '/session/deleted';
    });
};

// bind forms
app.bindForms = function() {
    if(document.querySelector("form")){
        document.querySelector("form").addEventListener("submit",function(e){
            // stop form from submitting
            e.preventDefault();
            var formId = this.id;
            var path = this.action;
            var method = this.method.toUpperCase();
            // hide error message if currently being shown due to previous error
            document.querySelector("#"+formId+" .formError").style.display = 'hidden';
            // create payload from inputs
            var payload = {};
            var elements = this.elements;
            for(var i = 0; i < elements.length; i++){
                if(elements[i].type !== 'submit'){
                    var valueOfElement = elements[i].type == 'checkbox' ? elements[i].checked : elements[i].value;
                    payload[elements[i].name] = valueOfElement;
                }
            }
            // call api
            app.client.request(undefined,path,method,undefined,payload,function(statusCode,responsePayload){
                // display error on form if error needed
                if(statusCode !== 200){
                    if(statusCode == 403){
                        // log out user
                        app.logUserOut();
                    } else {
                        // try to get error from api or set default error message
                        var error = typeof(responsePayload.Error) == 'string' ? responsePayload.Error : 'An error has occured, please try again';
                        // set the formError field with error text
                        document.querySelector("#"+formId+" .formError").innerHTML = error;
                        // show error when needed with error text
                        document.querySelector("#"+formId+" .formError").style.display = 'block';
                    }
                } else {
                    app.formResponseProcessor(formId,payload,responsePayload);
                }
            });
        });
    }
};

// form response processor
app.formResponseProcessor = function(formId,requestPayload,responsePayload){
    var functionToCall = false;
    // if accountCreate is success --> login user
    if(formId == 'accountCreate'){
        // take phone and password --> login user
        var newPayload = {
            'phone' : requestPayload.phone,
            'password' : requestPayload.password,
        };

        app.client.request(undefined,'api/tokens','POST',undefined,newPayload,function(newStatusCode,newResponsePayload){
            // display error if needed
            if(newStatusCode !== 200){
                // set the formError field with error text
                document.querySelector("#"+formId+" .formError").innerHTML = 'Sorry, an error has occured. Please try again.';
                // show error when needed with error text
                document.querySelector("#"+formId+" .formError").style.display = 'block';
            } else {
                // if successful, set token and redirect user
                app.setSessionToken(newResponsePayload);
                window.location = '/checks/all';
            }
        });
    }
    if(formId == 'sessionCreate'){
        app.setSessionToken(responsePayload);
        window.location = '/checks/all';
    }
};

// get session token from localStorage and set in app.config object
app.getSessionToken = function(){
    var tokenString = localStorage.getItem('token');
    if(typeof(tokenString) == 'string'){
        try{
            var taken = JSON.parse(tokenString);
            app.config.sessionToken = token;
            if(typeof(token) == 'object'){
                app.setLoggedInClass(true);
            } else {
                app.setLoggedInClass(false);
            }
        }catch(e){
            app.config.sessionToken = false;
            app.setLoggedInClass(false);
        }
    }
};

// set or remove loggedIn class from the body
app.setLoggedInClass = function(add){
    var target = document.querySelector("body");
    if(add){
        target.classList.add('loggedIn');
    } else {
        target.classList.remove('loggedIn');
    }
};

// set session token in app.config object and localStorage
app.setSessionToken = function(token){
    app.config.sessionToken = token;
    var tokenString = JSON.stringify(token);
    localStorage.setItem('token',tokenString);
    if(typeof(token) == 'object'){
        app.setLoggedInClass(true);
    } else {
        app.setLoggedInClass(false);
    }
};

// renew token
app.renewToken = function(callback){
    var currentToken = typeof(app.config.sessionToken) == 'object' ? app.config.sessionToken : false;
    if(currentToken){
        // update token with new expiration
        var payload = {
            'id' : currentToken.id,
            'extend' : true,
        };
        app.client.request(undefined,'api/tokens','PUT',undefined,payload,function(statusCode,responsePayload){
            if(statusCode == 200){
                // get new token details
                var queryStringObject = {'id' : currentToken.id};
                app.client.request(undefined,'api/tokens','GET',queryStringObject,undefined,function(statusCode,responsePayload){
                    // display error if needed
                    if(statusCode == 200){
                        app.setSessionToken(responsePayload);
                        callback(false);
                    } else {
                        app.setSessionToken(false);
                        callback(true);
                    }
                });
            } else {
                app.setSessionToken(false);
                callback(true);
            }
        });
    } else {
        app.setSessionToken(false);
        callback(true);
    }
};

// loop to renew token often so user session doesn't expire
app.tokenRenewalLoop = function(){
    setInterval(function(){
        app.renewToken(function(err){
            if(!err){
                console.log("Toekn renewed successfully @ "+Date.now());
            }
        });
    },1000 * 60); // every minute
};

// init (bootstrapping)
app.init = function(){
    // bind form submissions
    app.bindForms();
    // bind logout button
    app.bindLogoutButton();
    // get token from localStorage
    app.getSessionToken();
    // renew token
    app.tokenRenewalLoop();
};

// call init processes after window loads
window.onload = function(){
    app.init();
};
