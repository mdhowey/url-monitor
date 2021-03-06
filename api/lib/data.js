/*
 * Library for storing and editing data (CRUD)
 */

// dependencies
var fs = require('fs');
var path = require('path');
var helpers = require('./helpers');

// container for module
var lib = {};

// base directory of the data folder, create clean path to .data
lib.baseDir = path.join(__dirname, '/../.data/');

// write data to a file
lib.create = function(dir,file,data,callback){
    // open file for writing
    // fileDescriptor --> uniquely identify file
    fs.open(lib.baseDir+dir+'/'+file+'.json','wx',function(err,fileDescriptor){
        if(!err && fileDescriptor){
            // convert data to string
            var stringData = JSON.stringify(data);
            // write to file and close
            fs.writeFile(fileDescriptor,stringData,function(err){
                if(!err){
                    fs.close(fileDescriptor, function(err){
                        if(!err) {
                            callback(false);
                        } else {
                            callback('Error writing to new file; try again');
                        }
                    });
                } else {
                    callback('Error writing to new file; try again');
                }
            });
        } else {
            callback('Could not create new file, it may already exist');
        }
    });
};

// read data from file
lib.read = function(dir,file,callback){
    fs.readFile(lib.baseDir+dir+'/'+file+'.json','utf-8',function(err,data){
        if(!err && data) {
            var parsedData = helpers.parseJsonToObject(data);
            callback(false,parsedData);
        } else {
            callback(err,data);
        }
    });
};

// update data inside a file
lib.update = function(dir,file,data,callback){
    // open file for writing
    fs.open(lib.baseDir+dir+'/'+file+'.json','r+',function(err,fileDescriptor){
        if(!err && fileDescriptor) {
            // convert data to string
            var stringData = JSON.stringify(data);
            // truncate new file
            fs.truncate(fileDescriptor,function(err){
                if(!err) {
                    // write to file and close
                    fs.writeFile(fileDescriptor,stringData,function(err){
                        if(!err){
                            fs.close(fileDescriptor,function(err){
                                if(!err){
                                    callback(false);
                                } else {
                                    callback('Error closing existing file; try again');
                                }
                            });
                        } else {
                            callback('Error writing to existing file; try again');
                        }
                    });
                } else {
                    callback('Error truncating file; try again');
                }
            });
        } else {
            callback('Could not open file for updating, it may not exist yet...');
        }
    });
};

// delete file
lib.delete = function(dir,file,callback){
    // unlink the file
    fs.unlink(lib.baseDir+dir+'/'+file+'.json',function(err){
        if(!err){
            callback(false);
        } else {
            callback('Error deleting file; try again');
        }
    });
};

// list all items in dir
lib.list = function(dir,callback){
    fs.readdir(lib.baseDir+dir+'/',function(err,data){
        if(!err && data && data.length > 0) {
            var trimmedFileNames = [];
            data.forEach(function(fileName){
                trimmedFileNames.push(fileName.replace('.json',''));
            });
            callback(false,trimmedFileNames);
        } else {
            callback(err,data);
        }
    });
};

// export module
module.exports = lib;
