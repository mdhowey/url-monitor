/*
 * library for storing and rotating logs
 *
 */

// dependencies
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

// container for module
var lib = {};

// base dir of logs
lib.baseDir = path.join(__dirname,'/../.logs/');

// append string to file; create file if !exist
lib.append = function(file,str,callback){
    // open file
    fs.open(lib.baseDir+file+'.log','a',function(err,fileDescriptor){
        if(!err && fileDescriptor) {
            // append file and close it
            fs.appendFile(fileDescriptor,str+'\n',function(err){
                if(!err){
                    fs.close(fileDescriptor,function(err){
                        if(!err){
                            callback(false);
                        } else {
                            callback('Error closing file that was being appended to');
                        }
                    });
                } else {
                    callback('Error appending to file');
                }
            });
        } else {
            callback('Could not open file for appending');
        }
    });
};

// list all logs; optionally, include compressed logs
lib.list = function(includeCompressedLogs,callback){
    fs.readdir(lib.baseDir,function(err,data){
        if(!err && data && data.length > 0){
            var trimmedFileNames = [];
            data.forEach(function(fileName){
                // add .log/ files
                if(fileName.indexOf('.log') > -1){
                    trimmedFileNames.push(fileName.replace('.log',''));
                }
                // add on .gz files to array
                if(fileName.indexOf('.g<.b64') > -1 && includeCompressedLogs){
                    trimmedFileNames.push(fileName.replace('.gz.b64',''));
                }
            });
            callback(false,trimmedFileNames);
        } else {
            callback(err,data);
        }
    });
};

// compress contents of .log --> .gz.b64 in .logs/
lib.compress = function(logId,newFileId,callback){
    var sourceFile = logId+'.log';
    var destfile = newFileId+'.gz.b64';
    // read src file
    fs.readFile(lib.baseDir+sourceFile,'utf8',function(err,inputString){
        if(!err && inputString){
            zlib.gzip(inputString,function(err,buffer){
                if(!err && buffer){
                    // send data to dest file
                    fs.open(lib.baseDir+destfile,'wx',function(err,fileDescriptor){
                        if(!err && fileDescriptor){
                            // write to dest file
                            fs.writeFile(fileDescriptor,buffer.toString('base64'),function(err){
                                if(!err){
                                    // close dest file
                                    fs.close(fileDescriptor,function(err){
                                        if(!err){
                                            callback(false);
                                        } else {
                                            callback(err);
                                        }
                                    });
                                } else {
                                    callback(err);
                                }
                            });
                        } else {
                            callback(err);
                        }
                    });

                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
};

// decompress contents of .gz.b64 file into str var
lib.decompress = function(fileId,callback){
    var fileName = fileId+'.gz.b64';
    fs.readFile(lib.baseDir+fileName,'utf8',function(err,str){
        if(!err && str){
            // decompress
            var inputBuffer = Buffer.from(str,'base64');
            zlib.unzip(inputBuffer,function(err,outputBuffer){
                if(!err && outputBuffer){
                    var str = outputBuffer.toString();
                    callback(false,str);
                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
};

// truncating log file
lib.truncate = function(logId,callback){
    fs.truncate(lib.baseDir+logId+'.log',0,function(err){
        if(!err){
            callback(false);
        } else {
            callback(err);
        }
    });
}

// export module
module.exports = lib;
