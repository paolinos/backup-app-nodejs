// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
(function(){
  var fs = require('fs');

  const dbConnector = require('./js/DBConnector');
  const FileHelper = require('./js/FileHelper');
  const EventManager = require('./js/EventManager');
  const popUpOption = require('./js/PopUpOption');
  const PageClass = require('./js/PageClass');

  dbConnector.addCompleteEvent(function(){
    LoadListBackups(dbConnector.getList());
  })
  dbConnector.init("data/test.db");

  popUpOption.hide();


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


  var dashboardPage = new PageClass('dashboard');
  var dashboardClicks = function(name){
    switch (name) {
      case "#createBtn":
        popUpOption.show();
        break;
    }
  }
  dashboardPage.addClickEvent("#createBtn", dashboardClicks);
  const $backupTable = dashboardPage.querySelector("#listBackup");

  var dashboardItemClick = function(item){
    //console.log(item.currentTarget.getAttribute('id'));
    if(item.currentTarget != null){
      var tmpId = item.currentTarget.getAttribute('id');
      if(tmpId){
          var result = dbConnector.get(tmpId);
          if(result != null){
            popUpOption.show(result);
          }
      }
    }
  }

  function LoadListBackups(list){
    var _body = "";
    list.forEach((item,pos) => {
      _body += '<tr id="'+item.name+'"><td>'+item.name+'</td><td>'+item.lastRun+'</td><td>'+item.resultComment+'</td><td>'+item.status+'</td><td>'+item.nextPlan+'</td></tr>';
    })
    $backupTable.innerHTML = _body;

    $backupTable.querySelectorAll("tr").forEach((item,pos) => {
      item.addEventListener('click', dashboardItemClick);
    })
  }


  popUpOption.addCompleteEvent(function(result){
    if(result.ok){
      //result.path
      //result.data

      console.log(result.data);
      //TODO: Save main file
      dbConnector.set(result.data.name, {
        "source":result.data.source,
        "destination":result.data.destination,
        "schedule":result.data.schedule
      });
      
      /*
      fs.writeFile(result.path, JSON.stringify(result.data), function(err) {
          if(err) {
              return console.log(err);
          }
          console.log("The file was saved!");
      });
      */

    }
  })


  // ---------------------------  Testing
  fromPath = 'e:\\something\\';
  toPath = 'z:\\something\\';
  //backUpApp.startBackUp({source:fromPath, target:toPath});

})();
