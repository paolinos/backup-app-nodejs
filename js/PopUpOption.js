/*
 *  PopUpOption instance
 */
module.exports = (function(){
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

  var __addSourceToBody = function(path, type){
    $_sourceBody.innerHTML += '<tr><td>'+path+'</td><td>'+type+'</td><td><button class="button-table-del" data-del="'+path+'>Delete</button></td></tr>';
  }

  $_btnAddSourceFolder.addEventListener('click', function(){
    __showWarningMsg();
    _callbackSelectedFolder = function(path){
      if(__addToArrayIfNotExist(_data.source.folders, path)){
        __addSourceToBody(path,"Folder");
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
        __addSourceToBody(path,"File");
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
        __addDestination(path);
      }else{
        __showWarningMsg("The folder destination already exist or exist in the source folder.");
      }

    }
    $_btnFolderSelect.click();
  });

  var __addDestination = function(path){
    $_destinationBody.innerHTML += '<tr><td>'+path+'</td><td>Folder</td><td>Delete</td></tr>';
  }

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
  };

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

    if(_completeCallEvent != null){
      //_fileName = name + "-backup.bk";
      //console.log(_data);
      ///_data.name = name;
      _completeCallEvent({
        ok:true,
        //path:_fileName,
        data:_data
      });

      __show(false);
    }else{
      __show(false);
    }
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
    $_destinationBody.innerHTML = "";

    __loadData();
  }

  var __loadData = function(){
    //TODO: Fill data
    //  Source Page
    $_name.value = _data.name;

    for (var i = 0; i < _data.source.files.length; i++) {
      var path = _data.source.files[i];
      __addSourceToBody(path,"File");
    }
    for (var i = 0; i < _data.source.folders.length; i++) {
      var path = _data.source.folders[i];
      __addSourceToBody(path,"Folder");
    }
    //  Destination Page
    for (var i = 0; i < _data.destination.folders.length; i++) {
      __addDestination(_data.destination.folders[i]);
    }

    //  Schedule Page
    // schedule.type
    _timeSchedule.hour.value = _data.schedule.time.hour;
    _timeSchedule.minute.value = _data.schedule.time.minute;

    for (var i = 0; i < _data.schedule.days.length; i++) {
      var val = _data.schedule.days[i]
      if(val >= 0 && val < 7){
        _dayList[val].checked = true;
      }
    }
  }

  var __show = function(val=true){
    if(val){
      __init();
      $_back.style.display = "block";
      $_node.style.display = "block";
    }else{
      $_back.style.display = "none";
      $_node.style.display = "none";
      __clearData();
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
          _data.name =  data.name;
          if(data.configuration!== undefined)
          {
            if(data.configuration.source !== undefined){
                _data.source.files = data.configuration.source.files === undefined ? [] : data.configuration.source.files;
                _data.source.folders = data.configuration.source.folders === undefined ? [] : data.configuration.source.folders;
            }
            if(data.configuration.destination !== undefined){
              _data.destination.folders = data.configuration.destination.folders === undefined ? [] : data.configuration.destination.folders;
            }
            if(data.configuration.schedule !== undefined){
                _data.schedule.type = data.configuration.schedule.type === undefined ? 0 : data.configuration.schedule.type;
                _data.schedule.days = data.configuration.schedule.days === undefined ? [] : data.configuration.schedule.days;
                if(_data.schedule.time !== undefined){
                  _data.schedule.time.hour = data.configuration.schedule.time.hour === undefined ? 0 : data.configuration.schedule.time.hour;
                  _data.schedule.time.minute = data.configuration.schedule.time.minute === undefined ? 0 : data.configuration.schedule.time.minute;
                }
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
