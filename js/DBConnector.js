/*
 * DBConnector
 */
module.exports = (function(){
  //---------------------------------------------------
  //                                        Properties
  const __EVENT_COMPLETE = "DBConnector_load_complete";
  const __EVENT_SAVE_COMPLETE = "DBConnector_save_complete";

  var _name = "";
  const _fs = require('fs');
  var _data = {};
  const _eventManager = require('./EventManager');
  //---------------------------------------------------

  //---------------------------------------------------
  //                                          Private
  var __loadData = function(){
    try {
      _fs.readFile(_name,'utf8', (err, data) => {
        if (err) throw err;
        _data = JSON.parse(data);
        // Call complete event
        _eventManager.dispatchEvent(__EVENT_COMPLETE);
      })
    } catch (e) {
      console.log(e);
    }
  };

  var __save = function(){
    try {
      _fs.writeFile(_name + "1", JSON.stringify(_data),'utf8', (err) => {
        if (err) throw err;
        console.log('It\'s saved!');
      });
    } catch (e) {
      console.log(e);
    }
  };
  //---------------------------------------------------

  //---------------------------------------------------
  //                                          Public
   return {
     init:function(name){
       _name = name;
       __loadData();
     },
     get:function(name){
       var pos = _data.list.indexOf(name);
       if(pos >= 0){
         return _data.data[pos];
       }
       return null;
     },
     getList:function(){
       return _data.data;
     },
     addCompleteEvent:function(callback){
       _eventManager.addEventListener(__EVENT_COMPLETE,callback);
     }
   }
   //---------------------------------------------------
 })();
