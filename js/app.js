var taAdd = function(data) {
    var ta = document.getElementById('data');
    var data = ta.innerHTML + '\n' + data + '\n';
    ta.innerHTML = data;
    ta.scrollTop = ta.scrollHeight;
};

var init = function() {
    var conButton = document.getElementById('connectionButton');
    var sendButton = document.getElementById('sendButton');
    var hostInput = document.getElementById('hostInput');
    var sendInput = document.getElementById('sendInput');
    var socketId;

    sendButton.onclick = function() {
        if(!socketId) {
            return;
        }
        var data = sendInput.value + '\r\n';
        var buffer = new ArrayBuffer(data.length);
        var view = new Uint8Array(buffer);
        for (var c = 0; c < data.length; c++) {
            view[c] = data.charCodeAt(c) % 256;
        }

        chrome.sockets.tcp.send(socketId, buffer, function(res){
            console.log(res);
            taAdd(data);
        });
    }

    conButton.onclick = function(){
        if (socketId) {
            chrome.sockets.tcp.close(socketId, function() {
                taAdd('Closed');
                conButton.value = 'Connect';
                sendButton.setAttribute('disabled', 'disabled');
                socketId = undefined;
            });
            return;
        }

        var address = hostInput.value;
        chrome.sockets.tcp.create( {}, function(socketInfo){
            socketId = socketInfo.socketId;
            taAdd('Socket created');
            chrome.sockets.tcp.connect(socketId, address.split(':')[0], parseInt(address.split(':')[1]) || 80, function(res) {
                if (chrome.runtime.lastError) {
                    taAdd(chrome.runtime.lastError.message);
                    chrome.sockets.tcp.close(socketId, function() {
                        taAdd('Closed by error');
                        conButton.value = 'Connect';
                        sendButton.setAttribute('disabled', 'disabled');
                        socketId = undefined;
                    });
                    return;
                }
                conButton.value = 'Disconnect';
                sendButton.removeAttribute('disabled')
                taAdd('Socket connected');
            });
        });
    };

    chrome.sockets.tcp.onReceive.addListener(function(info){
        if(info.socketId !== socketId) {
            return;
        }
        var view = new Uint8Array(info.data);
        var text = '';
        view.forEach(function(ch){
            text += String.fromCharCode(ch);
        });
        taAdd(text);
    });
};
document.addEventListener("DOMContentLoaded", init);