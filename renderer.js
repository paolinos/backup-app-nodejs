// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
(function(){
  var fs = require('fs');

  var dbConnector = require('./js/DBConnector');
  const FileHelper = require('./js/FileHelper');
  const EventManager = require('./js/EventManager');

  dbConnector.addCompleteEvent(function(){
    LoadListBackups(dbConnector.getList());
  })
  dbConnector.init("data/test.db");

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
      },
      querySelector:function(name){
        return $node.querySelector(name);
      },
      querySelectorAll:function(name){
        return $node.querySelectorAll(name);
      }
    }
  });

  var popUpOption = (function(){
    var $_back = document.getElementById("back-area");
    var $_node = document.getElementById("windowBackUp");

    var _callbackSelectedFolder = null;
    var _callbackSelectedFile = null;
    var _completeCallEvent = null;

    var _data = null;
    var _fileName = null;

    //  Input Name
    var $_name =  $_node.querySelector('#txtBackUpName');

    // Hidden Folder/File selectors
    var $_btnFolderSelect =  $_node.querySelector('#btnFolderSelect');
    $_btnFolderSelect.onchange = function(){
      if(_callbackSelectedFolder != null){
        _callbackSelectedFolder($_btnFolderSelect.files[0].path);
        $_btnFolderSelect.value = "";
      }
    }
    var $_btnFileSelect =  $_node.querySelector('#btnFileSelect');
    $_btnFileSelect.onchange = function(){
      if(_callbackSelectedFile != null){
        _callbackSelectedFile($_btnFileSelect.files[0].path);
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
      __showWarningMsg();
      _callbackSelectedFolder = function(path){
        if(__addToArrayIfNotExist(_data.source.folders, path)){
          $_sourceBody.innerHTML += '<tr><td>'+path+'</td><td>Folder</td></tr>';
        }else{
          __showWarningMsg('The folder source already exist, in the backup list.');
        }
      }
      $_btnFolderSelect.click();
    });
    $_btnAddSourceFile.addEventListener('click', function(){
      __showWarningMsg();
      _callbackSelectedFile = function(path){
        if(__addToArrayIfNotExist(_data.source.files, path)){
          $_sourceBody.innerHTML += '<tr><td>'+path+'</td><td>File</td></tr>';
        }else{
          __showWarningMsg('The file source already exist, in the backup list.');
        }
      }
      $_btnFileSelect.click();
    });

    //  Destination
    $_btnAddDestinationFolder = $_tabDestination.querySelector("#btnAddDestinationFolder");
    $_destinationBody = $_tabDestination.querySelector("#destinationBody");
    $_btnAddDestinationFolder.addEventListener('click', function(){
      __showWarningMsg();
      _callbackSelectedFolder = function(path){
        if(__addToArrayIfNotExist(_data.destination.folders, path, _data.source.folders)){
          $_destinationBody.innerHTML += '<tr><td>'+path+'</td><td>Folder</td></tr>';
        }else{
          __showWarningMsg("The folder destination already exist or exist in the source folder.");
        }
      }
      $_btnFolderSelect.click();
    });

    // Schedule
    var _dayList = [
        $_tabSchedule.querySelector("#chkDay1"),
        $_tabSchedule.querySelector("#chkDay2"),
        $_tabSchedule.querySelector("#chkDay3"),
        $_tabSchedule.querySelector("#chkDay4"),
        $_tabSchedule.querySelector("#chkDay5"),
        $_tabSchedule.querySelector("#chkDay6"),
        $_tabSchedule.querySelector("#chkDay7")
    ];
    var _timeSchedule = {
      hour: $_tabSchedule.querySelector("#txtHour"),
      minute: $_tabSchedule.querySelector("#txtMinute")
    }


    $_btnSaveBackUp = $_node.querySelector('#btnSaveBackUp');
    $_btnCancelBackUp = $_node.querySelector('#btnCancelBackUp');
    $_lblMsg = $_node.querySelector('#lblMsg');

    $_btnSaveBackUp.addEventListener('click', function(){
      //  Validate Panels
      __showWarningMsg();
      var name = $_name.value;
      if(name.length <= 1){
        __showWarningMsg('Add the backup Name');
        return;
      }
      if(!__sourceAndDestinationPanelIsValid() ){
        __showWarningMsg('Error inthe Source or Destination panel.');
        return;

      }
      if( !__schedulePanelIsValid() ){
        __showWarningMsg('Error inthe Schedule panel.');
        return;
      }

      //
      __show(false);

      if(_completeCallEvent != null){
        _fileName = name + "-backup.bk";
        _data.name = name;
        _completeCallEvent({
          ok:true,
          path:_fileName,
          data:_data
        });
      }
      __clearData();
    });
    $_btnCancelBackUp.addEventListener('click',function(){
      __showWarningMsg();
      __show(false);
    });

    var __addToArrayIfNotExist = function(lst, val, otherlst=null){
      var pos = lst.indexOf(val);
      if(pos >= 0) return false;

      if(otherlst != null){
        var pos = otherlst.indexOf(val);
        if(pos >= 0) return false;
      }

      lst.push(val);
      return true;
    }

    var __showWarningMsg = function(msg = ''){
      $_lblMsg.innerHTML = msg;
    }

    var __display = function($n, val="block"){
      $n.style.display = val;
    }

    var __clearData = function(){
      _data = {
        name:'',
        source:{
          files:[],
          folders:[]
        },
        destination:{
          folders:[]
        },
        schedule:{
          type:0,
          days:[],
          time:{
            hour:0,
            minute:0
          }
        }
      };
    }
    __clearData();

    var __init = function(){
      $_name.innerHTML = "";
      __display($_tabSource);
      __display($_tabDestination,'none');
      __display($_tabSchedule,'none');

      $_sourceBody.innerHTML = "";
      __clearData();
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

    var __checkNumberTime = function(num){
      return num;
    }

    var __sourceAndDestinationPanelIsValid = function(){
      return (
          (_data.source.files.length > 0 || _data.source.folders.length > 0) &&
          (_data.destination.folders.length > 0 )
        );
    }
    var __schedulePanelIsValid = function(){
      _data.schedule.days = [];

      var checks = [];
      for (var i = 0; i < _dayList.length; i++) {
        if(_dayList[i].checked){
          _data.schedule.days.push(i);
        }
      }

      _data.schedule.time.hour = __checkNumberTime(_timeSchedule.hour.value);
      _data.schedule.time.minute = __checkNumberTime(_timeSchedule.minute.value);

      return _data.schedule.days.length > 0 &&
            (_data.schedule.time.hour.length > 0 && _data.schedule.time.minute.length > 0 );
    }

    return {
      show:function(data=null){

        if(data != null){
            if(data.source !== undefined){
                _data.source.files = data.source.files === undefined ? [] : data.source.files;
                _data.source.folders = data.source.folders === undefined ? [] : data.source.folders;
            }
            if(data.destination !== undefined){
              _data.destination.folders = data.destination.folders === undefined ? [] : data.destination.folders;
            }
            if(data.schedule !== undefined){
                _data.schedule.type = data.schedule.type === undefined ? 0 : data.schedule.type;
                _data.schedule.days = data.schedule.days === undefined ? [] : data.schedule.days;
                if(_data.schedule.time !== undefined){
                  _data.schedule.time.hour = data.schedule.time.hour === undefined ? 0 : data.schedule.time.hour;
                  _data.schedule.time.minute = data.schedule.time.minute === undefined ? 0 : data.schedule.time.minute;
                }
            }
        }
        __show();
      },
      hide:function(){
        __show(false);
      },
      addCompleteEvent:function(call){
        _completeCallEvent = call;
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
  const $backupTable = dashboardPage.querySelector("#listBackup");

  var dashboardItemClick = function(item){
    //console.log(item.currentTarget.getAttribute('id'));
    if(item.currentTarget != null){
      var tmpId = item.currentTarget.getAttribute('id');
      if(tmpId){
          var result = dbConnector.get(tmpId);
          if(result != null){
            //TODO: show popup options data
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

      fs.writeFile(result.path, JSON.stringify(result.data), function(err) {
          if(err) {
              return console.log(err);
          }
          console.log("The file was saved!");
      });
    }
  })


  // ---------------------------  Testing
  fromPath = 'e:\\something\\';
  toPath = 'z:\\something\\';
  //backUpApp.startBackUp({source:fromPath, target:toPath});

})();
