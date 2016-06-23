var dataAdd = function(data, type) {
    var dataDiv = document.getElementById('data');
    var p = document.createElement('P');
    p.innerText = data;
    if (type) {
        p.classList.add(type);
    }
    dataDiv.appendChild(p);
    dataDiv.scrollTop = dataDiv.scrollHeight;
};

var init = function() {
    var hostSubmit = document.getElementById('hostSubmit');
    var hostInput = document.getElementById('hostInput');
    var hostForm = document.getElementById('hostForm');

    var sendForm = document.getElementById('sendForm');
    var sendInput = document.getElementById('sendInput');

    var socketId;

    // Get last host from local storage
    chrome.storage.local.get('host', function(res){
        if(res.host) {
            hostInput.value = res.host;
        }
    });

    // On connect to host submit
    hostForm.onsubmit = function(){
        // If socket connected - disconnect
        if (socketId) {
            chrome.sockets.tcp.close(socketId, function() {
                hostSubmit.value = 'Connect';
                socketId = undefined;
                dataAdd('Socket close', 'ready');
            });
            return false;
        }

        chrome.sockets.tcp.create( {}, function(socketInfo){
            socketId = socketInfo.socketId;
            dataAdd('Socket created' ,'ready');
            chrome.sockets.tcp.connect(socketId, hostInput.value.split(':')[0], parseInt(hostInput.value.split(':')[1]) || 80, function(res) {
                if (chrome.runtime.lastError) {
                    chrome.sockets.tcp.close(socketId, function() {
                        socketId = undefined;
                        hostButton.value = 'Connect';
                        dataAdd('Socket closed by error: '+ chrome.runtime.lastError.message, 'error');
                    });
                    return;
                }
                chrome.storage.local.set({host: hostInput.value});
                hostSubmit.value = 'Disconnect';
                dataAdd('Socket connected', 'ready');

            });
        });
        return false;
    };

    // On message submit
    sendForm.onsubmit = function() {
        if(!socketId) {
            dataAdd('Socket is disconnected', 'error');
            return false;
        }
        // Check connection
        chrome.sockets.tcp.getInfo(socketId, function(info){
            if (!info.connected) {
                hostSubmit.value = 'Connect';
                socketId = undefined;
                dataAdd('Socket closed by server', 'error');
                return;
            }
            var data = sendInput.value + '\r\n';
            var buffer = new ArrayBuffer(data.length);
            var view = new Uint8Array(buffer);
            for (var c = 0; c < data.length; c++) {
                view[c] = data.charCodeAt(c) % 256;
            }

            chrome.sockets.tcp.send(socketId, buffer, function(res){
                chrome.sockets.tcp.getInfo(socketId, function(info){
                    if (!info.connected) {
                        hostSubmit.value = 'Connect';
                        socketId = undefined;
                        dataAdd('Socket closed by server', 'error');
                    }
                });
                dataAdd(data, 'outcoming');
            });
        });
        
        return false;
    }

    chrome.sockets.tcp.onReceive.addListener(function(info){
        if(info.socketId !== socketId) {
            return;
        }
        var view = new Uint8Array(info.data);
        var text = '';
        view.forEach(function(ch){
            text += String.fromCharCode(ch);
        });
        dataAdd(text, 'incoming');
    });
    
    chrome.sockets.tcp.onReceiveError.addListener(function(info){
        if(info.socketId !== socketId) {
            return;
        }
        if(info.resultCode === -100) {
            dataAdd('Server reset connection', 'error');
            hostSubmit.value = 'Connect';
            socketId = undefined;
            dataAdd('Socket close', 'ready');
        } else {
            dataAdd('Error: ' + nfo.resultCode);
        }
    });
};
document.addEventListener("DOMContentLoaded", init);