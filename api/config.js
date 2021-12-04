/*
 * Create and export config variables
 *
 *
 */

 // container for all enviornments
 var enviornments = {};

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
