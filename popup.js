var isRunning = false;
localStorage.setItem("isRunning", isRunning) ;

document.getElementById("start").onclick = function(){
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {msg: "start"}, function(response) {
        console.log(response);
      });
    });
}

document.getElementById("download").onclick = function(){
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {msg: "download"}, function(response) {
        console.log(response);
      });
    });
}

chrome.runtime.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(request) {
    if (request.msg == "progress") {
      if(request.isRunning){
        $("#download").prop('disabled', true);
        $("#start").prop('disabled', true);
        $("#start").css("color", "gray");
      }

      if(request.isFinished) {
        $("#start").prop('disabled', false);
        $("#download").prop('disabled', false);
        $("#start").css("color", "white");
        $("#download").css("color", "white");
      } else {
        $("#download").prop('disabled', true);
        $("#download").css("color", "gray");
      }
  	}
  });
});