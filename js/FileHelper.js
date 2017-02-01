

/*
 *  FileHelper class
 */
module.exports = (function(){
  var fs = require('fs');

  var _fromPath, _toPath = null;
  const _eventManager = require('./EventManager');

  var _startProcess = function(source,target){
    /*
      Check if source file exist.
      Check if target file exist.
      Check sizes, update copy or do nothing.
    */

    try {
      _fromPath = source;
      _toPath = target;
      if(fs.existsSync(_fromPath)){
        var fromStats = fs.statSync(_fromPath);

        if(fs.existsSync(_toPath)){
          // Check
          var toStats = fs.statSync(_toPath);
          if(fromStats['size'] != toStats['size']){
            // File changed, recopy file
            __copyFile();
          }else{
            // file are the same. not copy and send complete
            __copyEventHandler(true,false);
          }

        }else{
          // Copy file
          __copyFile();
        }
      }
    } catch (e) {
      __copyEventHandler(false,false,e);
    }
  };

  var __copyFile = function(){
    try {
      var readFile = fs.createReadStream(_fromPath);
      readFile.on("error", function(err) {
        __copyEventHandler(false,false,err);
      });
      var writeFile = fs.createWriteStream(_toPath);
      writeFile.on("error", function(err) {
        __copyEventHandler(false,false,err);
      });
      writeFile.on("close", function(ex) {
        __copyEventHandler(true,true);
      });
      readFile.pipe(writeFile);
    } catch (e) {
      __copyEventHandler(false,false,e);
    }
  };

  var __copyEventHandler = function(ok,copied,err=null){
    if(ok){
      _eventManager.dispatchEvent("complete", {copied:copied,err:null});
    }else{
      _eventManager.dispatchEvent("error",{copied:false,err:err});
    }
  }

  return{
      addListener:function(eventname, callback){
        _eventManager.addEventListener(eventname, callback);
      },
      copy:function(source,target){
        _startProcess(source,target);
      }
  }
});
