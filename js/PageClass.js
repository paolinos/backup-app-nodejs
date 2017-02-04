/*
 *  PageClass class
 */
module.exports = (function(id){
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
