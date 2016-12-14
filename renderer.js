// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
(function(){
  var fs = require('fs');

  var EventManager = (function(){
    var _events = [];
    var _callbacks = [];

    var __addEventListener = function(name,call){
      _events.push(name);
      _callbacks.push(call);

      console.log(_events, _callbacks);
    };
    var __removeEventListener = function(name){
      var pos = _events.indexOf(name);
      if(pos >= 0){
        _events.splice(pos,1);
        _callbacks.splice(pos,1);
        console.log(_events, _callbacks);
      }
    };
    var __dispatchEvent = function(name,param){
      var pos = _events.indexOf(name);
      if(pos >= 0){
          if(param === null){
            _callbacks[pos]();
          }else{
              _callbacks[pos](param);
          }
      }
    };

    return {
      addEventListener:function(name,call){
        __addEventListener(name,call);
      },
      removeEventListener:function(name,call){
        __removeEventListener(name,call);
      },
      dispatchEvent:function(name,param=null){
        __dispatchEvent(name,param);
      }
    }
  });

  /*
   *  FileHelper class
   */
  var FileHelper = (function(){
    var fs = require('fs');

    var _fromPath, _toPath = null;
    var _eventManager = new EventManager();

    var _startProcess = function(source,target){
      /*
        Check if source file exist.
        Check if target file exist.
        Check sizes, update copy or do nothing.
      */
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

  var backUpApp = (function(){
    
    var __getFilesFromDirectory=function(source){
      fs.readdirSync(source, (err, files) => {
        files.forEach(file => {
          console.log(file);
        });
      });
    }

    return {
      startBackUp:function(params){
        __getFilesFromDirectory(params.source);
      }
    }
  })();

  var fromPath = 'C:\\Users\\-\\Desktop\\Copys\\e-shop.1.0.4.zip';
  var toPath = 'C:\\Users\\-\\Desktop\\Copy1\\e-shop.1.0.4.zip';


  backUpApp.startBackUp({source:'C:\\Users\\-\\Desktop\\Copys\\'});
  //copyDifferencefile(fromPath, toPath);

  var fileHelper = new FileHelper();
  fileHelper.addListener('complete', function(e){
    console.log("fileHelper - complete", e);
  });
  fileHelper.addListener('error', function(e){
    console.log("fileHelper - error", e);
  });


  var btnCopy = document.getElementById('btnCopy');
  var txtStatus = document.getElementById('txtStatus');

  btnCopy.onclick = function(){
    txtStatus.innerHTML = "Coping from:" + fromPath + "; to:" + toPath + ";"
    fileHelper.copy(fromPath, toPath);
  };


/*

*/

})();
