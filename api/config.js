/*
 * Create and export config variables
 *
 *
 */

 // container for all enviornments
 var environments = {};

 // staging object (default envirnmoent)
 environments.staging = {
     'port' : 3000,
     'envName' : 'staging'
 };
 // production object
 environments.production = {
     'port' : 5000,
     'envName' : 'production'
 };

// environment selection logic on command line
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerClass() : '';

// check that current environment is defined
var environmentToExport = typeof(environments[currentenvironment]) == 'object' ? environments[currentenvironment] : environments.staging;

// export module
module.exports = environmentToExport;
