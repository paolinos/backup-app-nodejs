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
    };
    var __removeEventListener = function(name){
      var pos = _events.indexOf(name);
      if(pos >= 0){
        _events.splice(pos,1);
        _callbacks.splice(pos,1);
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

  var FolderCopyManager = (function(){
    var _sourcePath, _targetPath=null;
    var _data = null;
    var _completeCallback = null;

    var _log = {
      error:[],
      copied:[]
    }

    /*
     *  init method
     */
    var __start = function(){
      var listData = __getFilesFromDirectory(_sourcePath);
      _data = {
        files:listData.files,
        totalFiles:listData.files.length,
        filesCopied:0,
        directories:listData.directories,
        directoriesCopied:0,
        totalDirectories:listData.directories.length
      }
      __checkToCopy();
    }

    var __addLog = function(isok, source){
      if(isok){
        _log.copied.push(source);
      }else{
        _log.error.push(source);
      }
    }

    var __checkToCopy = function(){
      if(_data.filesCopied < _data.totalFiles)
      {
        var fileCoping = _data.files[_data.filesCopied];
        _data.filesCopied++;
        __copyFile(_sourcePath + fileCoping, _targetPath + fileCoping );
      }else if(_data.directoriesCopied < _data.totalDirectories)
      {
        var directoryPath = _data.directories[_data.directoriesCopied];
        _data.directoriesCopied++;
        //  Create Directory if not exist
        __checkAndCreateDirectory(_targetPath + directoryPath);

        var tmp = new FolderCopyManager();
        tmp.addCompleteEvent(function(log){
          console.log();
          var total = log.copied.length;
          for (var i = 0; i < total; i++) {
            _log.copied.push(log.copied[i]);
          }
          total = log.error.length;
          for (var i = 0; i < total; i++) {
            _log.error.push(log.error[i]);
          }
          __checkToCopy();
        });
        tmp.copyFromTo(_sourcePath + directoryPath + "\\", _targetPath + directoryPath + "\\");
      }else{
        if(_completeCallback != null){
          _completeCallback(_log);
        }
        console.log(_log);
      }
    }

    var __addEventListener = function(call){
      _completeCallback = call;
    }

    var __copyFile = function(source,target){
      var fileHelper = new FileHelper();
      fileHelper.addListener('complete', function(e){
        //console.log("fileHelper - complete", e);
        __addLog(true,source);
        __checkToCopy();
      });
      fileHelper.addListener('error', function(e){
        //console.log("fileHelper - error", e);
        console.log(e);
        __addLog(false,e.err.message);
        __checkToCopy();
      });
      //console.log("Trying to copy: " + source);
      fileHelper.copy(source,target);
    }
    var __checkAndCreateDirectory = function(path){
      if (!fs.existsSync(path)){
          fs.mkdirSync(path);
      }
    }

    var __getFilesFromDirectory = function(source){
      var result = {
        files:[],
        directories:[]
      }

      try {
        var files = fs.readdirSync(source);
        files.forEach(file => {
          //console.log('Try to get stat',file);

          //var checkFilePermissions = fs.accessSync(source + file, fs.constants.R_OK );
          //console.log(checkFilePermissions ? 'no access!' : 'can read/write -' + source + file);


          var statsPath = fs.statSync(source + file);

          if(statsPath.isDirectory()){
            result.directories.push(file);
          }else if(statsPath.isFile()){
            result.files.push(file);
          }
        });
      } catch (e) {
        //console.log(e.message);
        _log.error.push(e.message);
      }

      return result;
    }

    return {
      copyFromTo:function(source,target){
        _sourcePath = source;
        _targetPath = target;

        __start();
      },
      addCompleteEvent:function(callback){
        //_completeCallback = callback;
        __addEventListener(callback);
      }
    }
  });


  var backUpApp = (function(){
    var _sourcePath, _targetPath=null;
    var _startDate = null;


    var __getStringVal = function(val){
      return ((val>9 ? '' : '0') + val)
    }
    var __toFormatDate = function(date){
      var m = date.getMonth() + 1;
      var d = date.getDate();
      var y = date.getFullYear()

      return y +"-"+
              __getStringVal(m) +"-"+
              __getStringVal(d)
    }

    var __toFormatTime = function(date, concat=":"){
      var h = date.getHours()
      var m = date.getMinutes()
      var mm = date.getMilliseconds()

      return __getStringVal(h) + concat + __getStringVal(m);
    }

    var __getLogFile = function(date){
      return __toFormatDate(date) +"."+ __toFormatTime(date,".");
    }

    var __createLogFile = function(log){
      var currentTime = new Date();

      var txtLog = "Log backUpApp file \r\n \r\n";
      txtLog += "Starting time:\r\n" + __toFormatDate(_startDate) + "  " + __toFormatTime(_startDate) + "\r\n \r\n";
      txtLog += "Ended time:\r\n" + __toFormatDate(currentTime) + "  " + __toFormatTime(currentTime) + "\r\n \r\n";

      var total = log.copied.length;
      txtLog += "------------------------------\r\n \r\n Copied files: " + total + " \r\n \r\n";
      for (var i = 0; i < total; i++) {
        txtLog += log.copied[i] + "\r\n";
      }

      total = log.error.length;
      txtLog += "\r\n \r\n------------------------------\r\n \r\n Files with errors: " + total + " \r\n \r\n";
      for (var i = 0; i < total; i++) {
        txtLog += log.error[i] + "\r\n";
      }
      txtLog += "\r\n \r\n------------------------------\r\n \r\n";


      fs.writeFile("log"+__getLogFile(_startDate)+".txt", txtLog, function(err) {
          if(err) {
              return console.log(err);
          }
          console.log("The file was saved!");
      });
    }


    var copyManager = new FolderCopyManager();
    copyManager.addCompleteEvent(function(log){
      __createLogFile(log);
    });

    return {
      completeEvent:function(){

      },
      startBackUp:function(params){
        _sourcePath = params.source;
        _targetPath = params.target;
        _startDate = new Date();

        console.log("Starting time:" + __toFormatDate(_startDate) + "  " + __toFormatTime(_startDate));
        copyManager.copyFromTo(_sourcePath,_targetPath);
      }
    }
  })();

  var fromPath = 'C:\\Users\\-\\Desktop\\Copys\\';
  var toPath = 'C:\\Users\\-\\Desktop\\Copy1\\';
  //copyDifferencefile(fromPath, toPath);

  /*
   *  PageC
   */
  var PageClass = (function(id){
    var _id = id;
    var $node = document.getElementById(_id);

    var __show=function(val){
      if(val){
        $node.style.display = "block";
      }else{
        $node.style.display = "none";
      }
    }

    return {
      show:function(){
        __show(true);
      },
      hide:function(){
        __show(false);
      },
      addClickEvent:function(name,callback){
        $tmp = $node.querySelector(name);
        $tmp.addEventListener('click', function(){
          callback(name);
        })
      }
    }
  });

  var popUpOption = (function(){
    var $_back = document.getElementById("back-area");
    var $_node = document.getElementById("windowBackUp");

    var _callbackSelectedFolder = null;
    var _callbackSelectedFile = null;


    //  Input Name
    var $_name =  $_node.querySelector('#txtBackUpName');

    // Hidden Folder/File selectors
    var $_btnFolderSelect =  $_node.querySelector('#btnFolderSelect');
    $_btnFolderSelect.onchange = function(){
      if(_callbackSelectedFolder != null){
        _callbackSelectedFolder($_btnFolderSelect.value);
        $_btnFolderSelect.value = "";
      }
    }
    var $_btnFileSelect =  $_node.querySelector('#btnFileSelect');
    $_btnFileSelect.onchange = function(){
      if(_callbackSelectedFile != null){
        _callbackSelectedFile($_btnFileSelect.value);
        $_btnFileSelect.value = "";
      }
    }

    // Tabs Buttons
    var $_btnTabSource =  $_node.querySelector('#btnTabSource');
    var $_btnTabDestination =  $_node.querySelector('#btnTabDestination');
    var $_btnTabSchedule =  $_node.querySelector('#btnTabSchedule');

    //  Tabs Areas
    var $_tabSource = $_node.querySelector('#tabSource');
    var $_tabDestination = $_node.querySelector('#tabDestination');
    var $_tabSchedule = $_node.querySelector('#tabSchedule');

    var ___clickTabEvents = function(e){
      switch (e.target.id) {
        case "btnTabSource":
          __display($_tabSource);
          __display($_tabDestination,'none');
          __display($_tabSchedule,'none');
          break;
        case "btnTabDestination":
          __display($_tabSource,'none');
          __display($_tabDestination);
          __display($_tabSchedule,'none');
          break;
        case "btnTabSchedule":
          __display($_tabSource,'none');
          __display($_tabDestination,'none');
          __display($_tabSchedule);
          break;
      }
    }
    $_btnTabSource.addEventListener('click', ___clickTabEvents);
    $_btnTabDestination.addEventListener('click', ___clickTabEvents);
    $_btnTabSchedule.addEventListener('click', ___clickTabEvents);

    //  Tab Source
    $_btnAddSourceFolder = $_tabSource.querySelector("#btnAddSourceFolder");
    $_btnAddSourceFile = $_tabSource.querySelector("#btnAddSourceFile");
    $_sourceBody = $_tabSource.querySelector("#sourceBody");

    $_btnAddSourceFolder.addEventListener('click', function(){
      _callbackSelectedFolder = function(path){
        $_sourceBody.innerHTML += '<tr><td class="td-80">'+path+'</td><td>Folder</td></tr>'
      }
      $_btnFolderSelect.click();
    });
    $_btnAddSourceFile.addEventListener('click', function(){
      _callbackSelectedFile = function(path){
        $_sourceBody.innerHTML += '<tr><td class="td-80">'+path+'</td><td>File</td></tr>'
      }
      $_btnFileSelect.click();
    });


    $_btnSaveBackUp = $_node.querySelector('#btnSaveBackUp');
    $_btnCancelBackUp = $_node.querySelector('#btnCancelBackUp');

    $_btnSaveBackUp.addEventListener('click', function(){
      //  Validate Panels
      if( __sourcePanelIsValid() && __destinationPanelIsValid() && __schedulePanelIsValid() ){
        // Close popup
        //

      }
    });
    $_btnCancelBackUp.addEventListener('click',function(){
      __show(false);
    });




    var __display = function($n, val="block"){
      $n.style.display = val;
    }

    var __init = function(){
      $_name.innerHTML = "";
      __display($_tabSource);
      __display($_tabDestination,'none');
      __display($_tabSchedule,'none');

      $_sourceBody.innerHTML = "";
    }

    var __show = function(val=true){
      if(val){
        __init();
        $_back.style.display = "block";
        $_node.style.display = "block";
      }else{
        $_back.style.display = "none";
        $_node.style.display = "none";
      }
    }

    var __sourcePanelIsValid = function(){
      return false;
    }
    var __destinationPanelIsValid = function(){
      return false;
    }
    var __schedulePanelIsValid = function(){
      return false;
    }

    return {
      show:function(){
        __show();
      },
      hide:function(){
        __show(false);
      }
    }
  })();
  popUpOption.hide();


  var dashboardPage = new PageClass('dashboard');
  var dashboardClicks = function(name){
    switch (name) {
      case "#createBtn":
        popUpOption.show();
        break;
    }
  }
  dashboardPage.addClickEvent("#createBtn", dashboardClicks);




  // ---------------------------  Testing
  /*
  //var btnCopy = document.getElementById('btnCopy');
  //var txtStatus = document.getElementById('txtStatus');

  btnCopy.onclick = function(){
    //txtStatus.innerHTML = "Start copying;"

    fromPath = 'C:\\Users\\-\\Desktop\\Musica\\Agapornis\\';
    toPath = 'D:\\Musica\\Musica\\Agapornis\\';
    //backUpApp.startBackUp({source:fromPath, target:toPath});
  };
  */

  fromPath = 'C:\\Windows\\';
  toPath = 'D:\\Windows\\';
  //backUpApp.startBackUp({source:fromPath, target:toPath});


})();
