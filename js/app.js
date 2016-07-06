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

    var eolSelect = document.getElementById('eolSelect');
    var charsetSelect = document.getElementById('charsetSelect');
    var escCheckbox = document.getElementById('escCheckbox');
    var socketId;

    

    // Restore host
    chrome.storage.local.get('host', function(res){
        if(res.host) {
            hostInput.value = res.host;
        }
    });

    // Restore and save End of Line
    chrome.storage.local.get('eol', function(res){
        if(res.eol) {
            eolSelect.value = res.eol;
        }
    });

    eolSelect.onchange = function() {
        chrome.storage.local.set({eol: eolSelect.value});
    }

    // Restore and save Charset select
    chrome.storage.local.get('charset', function(res){
        if(res.charset) {
            charsetSelect.value = res.charset;
        }
    });

    charsetSelect.onchange = function() {
        chrome.storage.local.set({charset: charsetSelect.value});
    }

    // Restore and save ESC
    chrome.storage.local.get('esc', function(res){
        if(res.esc !== undefined) {
            escCheckbox.checked = res.esc;
        }
    });

    escCheckbox.onchange = function() {
        chrome.storage.local.set({esc: escCheckbox.checked});
    }


    // On connect to host submit
    hostForm.onsubmit = function(){
        // Check socket
        if(socketId !== undefined) {
            chrome.sockets.tcp.close(socketId, function() {
                dataAdd('Socket closed', 'ready');
                hostSubmit.value = 'Connect';
            });
            return false;
        }

        // Create socket
        chrome.sockets.tcp.create({}, function(socketInfo){
            socketId = socketInfo.socketId;
            dataAdd('Socket ' + socketId + ' is created and ready for connection', 'ready');
            // Set connection
            chrome.sockets.tcp.connect(socketId, hostInput.value.split(':')[0], parseInt(hostInput.value.split(':')[1]) || 80, function(res) {
                if (chrome.runtime.lastError) {
                    dataAdd('Socket error: '+ chrome.runtime.lastError.message, 'error');
                    return;
                }
                chrome.storage.local.set({host: hostInput.value});
                hostSubmit.value = 'Disconnect';
                dataAdd('Connected to ' + hostInput.value, 'ready');
            });
        });

        return false;
    };

    // On message submit
    sendForm.onsubmit = function() {
        if (socketId === undefined) {
            hostSubmit.value = 'Connect';
            dataAdd('Socket is closed', 'error');
            return false;
        }
        chrome.sockets.tcp.getInfo(socketId, function(socketInfo){
            
            // Check connection
            if (!socketInfo.connected) {
                hostSubmit.value = 'Connect';
                dataAdd('Connection is closed', 'error');
                chrome.sockets.tcp.close(socketId, function() {
                    dataAdd('Socket ' + socketInfo.socketId + ' closed as disconnected', 'error');
                    hostSubmit.value = 'Connect';
                    socketId = undefined;
                });
                return;
            }

            var data = sendInput.value;
            switch (eolSelect.value) {
                case 'LF':
                    data += '\n';
                    break;
                case 'CR+LF':
                    data += '\r\n';
                    break;
                case 'CR':
                    data += '\r';
                    break;
            }
            var buffer = new ArrayBuffer(data.length);
            var view = new Uint8Array(buffer);
            for (var c = 0; c < data.length; c++) {
                view[c] = data.charCodeAt(c) % 256;
            }

            chrome.sockets.tcp.send(socketId, buffer, function(res){
                dataAdd(data, 'outcoming');
            });
        });
        
        return false;
    }

    // On incoming message
    chrome.sockets.tcp.onReceive.addListener(function(socketInfo){
        if(socketInfo.socketId !== socketId) {
            return;
        }
        var view = new Uint8Array(socketInfo.data);
        var text = '';
        view.forEach(function(ch){
            text += String.fromCharCode(ch);
        });
        dataAdd(text, 'incoming');
    });

    // On error    
    chrome.sockets.tcp.onReceiveError.addListener(function(socketInfo){
        chrome.sockets.tcp.close(socketId, function() {
            dataAdd('Socket ' + socketInfo.socketId + ' closed: ' + socketInfo.resultCode, 'ready');
            hostSubmit.value = 'Connect';
            socketId = undefined;
        });
    });
};
document.addEventListener("DOMContentLoaded", init);