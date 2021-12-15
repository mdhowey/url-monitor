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

// bind forms
app.bindForms = function() {
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
                // try to get error from api or set default error message
                var error = typeof(responsePayload.Error) == 'string' ? responsePayload.Error : 'An error has occured, please try again';
                // set the forError field with error text
                document.querySelector("#"+formId+" .formError").innerHTML = error;
                // show error when needed with error text
                document.querySelector("#"+formId+" .formError").style.display = 'block';
            } else {
                app.formResponseProcessor(formId,payload,responsePayload);
            }
        });
    });
};

// form response processor
app.formResponseProcessor = function(formId,requestPayload,responsePayload){
    var functionToCall = false;
    if(formId == 'accountCreate'){
        // @TODO write next part of process once account has been created
    }
};

// init (bootstrapping)
app.init = function(){
    // bind form submissions
    app.bindForms();
};

// call init processes after window loads
window.onload = function(){
    app.init();
};
