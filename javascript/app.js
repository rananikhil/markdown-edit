// namespace
window.application = {
  editor:"",
  apiLimit:1500,
  enabeAutoReload:false,
  enableShortcut:false,
  md:"",
  viewer:""
};
window.URL = window.URL || window.webkitURL;

// Dom Ready
$(function(){

  // handle file
  $("#lefile").change(function() {
     $('#fileinput').val($(this).val());
  }); 

  // button binding
  $(".btn").each(function(){
    var self = this;
    $(self).bind("hover",function(){
      $(self).tooltip({
          placement:"bottom",
          delay: { show: 100, hide: 100 }
      });
    })
    .bind("click",function(event){
      event.preventDefault();
      handleOnClick($(self).attr("id"));
    });
  });

  // checkbox binding
  $("#autoReload").change(function() {
     application.enabeAutoReload = ($(this).attr("checked") === "checked");
     autoReload();
  });

  // checkbox binding
  $("#enableShortcut").change(function() {
     application.enableShortcut = ($(this).attr("checked") === "checked");
  }); 

  $("body").keydown( function(event) {
    if (application.enableShortcut){ 
      var code = (event.keyCode ? event.keyCode : event.which)
      ,ctrl = event.ctrlKey
      ,alt = event.altKey
      ,shift = event.shiftKey
      ,cmd = event.metaKey;
      // browse file `ctrl + o`
      if ((ctrl || cmd) && code == 79) {
        event.preventDefault();
        $("#lefile").click();
        return;
      }
      // read file `ctrl + r`
      if ((ctrl || cmd) && code == 82) {
        event.preventDefault();
        readFile();
        return;
      }
      // raw .md file `ctrl + m`
      if ((ctrl || cmd) && code == 77) {
        event.preventDefault();
        viewRaw("md");
        return;
      }
      // raw .html file `ctrl + alt + h`
      if ((ctrl || cmd) && !alt && code == 72) {
        event.preventDefault();
        viewRaw("html");
        return;
      }
      // view .html file `ctrl + alt + h`
      if ((ctrl || cmd) && alt && code == 72) {
        event.preventDefault();
        openViewer();
        return;
      }
      // exec convert `ctrl + e`
      if ((ctrl || cmd) && code == 69) {
        event.preventDefault();
        convert();
        return;
      }
    }
  });

  // Initilize CodeMirror Editor
  application.editor = CodeMirror.fromTextArea(document.getElementById("in"), {
    mode: 'gfm',// github-flavored-markdown
    lineNumbers: true,
    matchBrackets: true,
    theme: "default",
    onFocus:function(){
      $(".CodeMirror-scroll").addClass("focus");
    },
    onBlur:function(){
      $(".CodeMirror-scroll").removeClass("focus");
    },
    onCursorActivity: function() {
      application.editor.setLineClass(hlLine, null, null);
      hlLine = application.editor.setLineClass(application.editor.getCursor().line, null, "activeline");
    }
  });
  var hlLine = application.editor.setLineClass(0, "activeline");

  // Initialize html view
  convert();
})

function handleOnClick(id){
  switch (id) {
    case "btnBrowse":
      // show file browse dialogue
      $("#lefile").click();
    break;
    case "btnRead":
      // read local file    
      readFile();
    break;    
    case "btnRawMd":
      // show Raw .md file    
      viewRaw("md");
    break;
    case "btnRawHtml":
      // show Raw .html file
      viewRaw("html");
    break;
    case "btnHtml":
      // view .html
      openViewer();
    break;
    case "btnConv":
      // exec convert  
      convert();
    break;
    default:
      console.log("Error:invalid case");
    break;
  }
}

// read local file
function readFile(f){
  var fileData = f || document.getElementById("lefile").files[0];
  if (!fileData){
    showAlert("File was not found.");
    return;
  }
  if (fileData.type && !fileData.type.match('text.*')) {
    showAlert("Cannot read file. Please set plain text file.");
    return;
  }
  var reader = new FileReader();
  reader.onerror = function (evt) {
    showAlert("Cannot read file, some eroor occuerd.");
    return;
  }
  reader.onload = function(evt){
    $("#in").val(evt.target.result);
    application.editor.setValue(evt.target.result);
    convert();
  }
  reader.readAsText(fileData, "utf-8");
  // console.log("start read");
}

// save file to data url
function viewRaw(file){
  var text,blobBuilder,blob;
  switch (file) {
    case "md":
      text = application.editor.getValue();
      break;
    case "html":
      text = $("#out").html();
      break;
    default:
      console.log("invalid param");
      return;
  }
  blob = new Blob([text], {type: "text/plain",charset:"utf-8"});
  window.open(window.URL.createObjectURL(blob),"_blank","width=800,height=800,titlebar=no,toolbar=yes,scrollbar=yes")
}

// exec auto reload per 5(sec) if markdown was changed
function autoReload(){
  if (application.enabeAutoReload){
    setTimeout(function(){
      if (application.md != application.editor.getValue()) convert();
      autoReload();
    },5000);
  }
}

// convert markdown to html
function convert(){
  // save CodeMirror to textarea
  application.editor.save();
  application.md = $("#in").val();

  // hide html
  $("#out").fadeOut().empty();
  
  // call github's API
  $.ajax({
    "url":"https://api.github.com/markdown/raw",
    "type":"POST",
    "contentType":"text/plain",
    "data":application.md,
    "complete":function(jqXHR, textStatus){
      // api limit count
      application.apiLimit = jqXHR.getResponseHeader("X-RateLimit-Remaining");
      if (application.apiLimit < 50) {
        showAlert("X-RateLimit-Remaining is less than 50. It was limited 5000 request per hour from same IP");
      }
    }
  })
  .done(function(data){
    // console.log("done");
    // render html data
    $("#out").addClass("display-none");
    setTimeout(function(){
      $("#out").append(data).fadeIn();
      if(application.viewer) application.viewer.location.reload();
    },500);    
  })
  .fail(function(data){
    // console.log("fail");
    showAlert("failed to ajax request. Try again.");
  })
  .always(function(data){
    // console.log("always");
    // do nothing.
  })
}

// showAlert
function showAlert(msg){
  $("#alertMessage>p").text(msg);
  $("#alertMessage")
  .removeClass("display-none")
  .removeClass("out")
  .addClass("in")
  .bind("close", function (evt) {
    evt.preventDefault();
    $(this)
    .removeClass("in")
    .addClass("out")
    .trigger("closed");
  })
  .bind("closed", function () {
    var self = this;
    setTimeout(function(){
      $(self).addClass("display-none")
    },500);
  });
}

// open view window
function openViewer(){
  if(application.viewer) application.viewer.close();
  application.htmlViewer = open('view.html','_blank','width=800,height=800,titlebar=no,toolbar=no,scrollbar=yes');
}

