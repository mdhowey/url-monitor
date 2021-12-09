/*
 * Create and export config variables
 */

 // container for all enviornments
 var environments = {};

 // staging object (default envirnmoent)
 environments.staging = {
     'httpPort' : 3000,
     'httpsPort' : 3001,
     'envName' : 'staging',
     'hashingSecret' : 'thisIsASecret',
     'maxChecks' : 5
 };
 // production object
 environments.production = {
     'httpPort' : 5000,
     'httpsPort' : 5001,
     'envName' : 'production',
     'hashingSecret' : 'thisIsAlsoASecret',
     'maxChecks' : 5
 };

 // environment selection logic on command line
 var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

 // check that current environment is defined
 var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

 // export module
 module.exports = environmentToExport;
