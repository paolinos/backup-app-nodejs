/*

var EventManager = require('./EventManager');
EventManager.foo();
EventManager.bar();
*/

module.exports = (function(){
  //---------------------------------------------------
  //                                          Properties
  var _events = [];
  var _callbacks = [];
  //---------------------------------------------------

  //---------------------------------------------------
  //                                          Private
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
  //---------------------------------------------------

  //---------------------------------------------------
  //                                          Public
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
  //---------------------------------------------------
})();
