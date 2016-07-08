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

var addEOL = function(text, eol) {
    switch (eol) {
        case 'LF':
            text += '\n';
            break;
        case 'CR+LF':
            text += '\r\n';
            break;
        case 'CR':
            text += '\r';
            break;
    }
    return text
};

var addESC = function(text) {
    text = text.replace(/\\"/g, '"');
    text = text.replace(/\\'/g, '\'');
    text = text.replace(/\\\\/g, '\\');
    text = text.replace(/\\n/g, '\n');
    text = text.replace(/\\r/g, '\r');
    text = text.replace(/\\t/g, '\t');
    text = text.replace(/\\b/g, '\b');
    text = text.replace(/\\f/g, '\f');
    text = text.replace(/\\e/g, String.fromCharCode(27));
    
    console.log(text);
    return text;
};

var init = function() {
    var hostSubmit = document.getElementById('hostSubmit');
    var hostInput = document.getElementById('hostInput');
    var hostForm = document.getElementById('hostForm');

    var sendForm = document.getElementById('sendForm');
    var sendInput = document.getElementById('sendInput');

    var eolSelect = document.getElementById('eolSelect');
    var charsetSelect = document.getElementById('charsetSelect');
    var escSelect = document.getElementById('escSelect');

    var socketId;
    var converter = new TextConverter('utf-8');
    var history = [];
    var historyPosition = 0;
    
    sendInput.onkeydown = function(event) {
        if(event.keyCode === 38 && historyPosition > 0) {
            historyPosition--;
            sendInput.value = history[historyPosition];
        }
        
        if(event.keyCode === 40 && historyPosition < history.length) {
            historyPosition++;
            sendInput.value = history[historyPosition] || '';
        }
        
    };

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
            converter = new TextConverter(res.charset);
        }
    });

    charsetSelect.onchange = function() {
        chrome.storage.local.set({charset: charsetSelect.value});
        converter = new TextConverter(charsetSelect.value);
    }

    // Restore and save ESC
    chrome.storage.local.get('esc', function(res){
        if(res.esc !== undefined) {
            escSelect.value = res.esc;
        }
    });

    escSelect.onchange = function() {
        chrome.storage.local.set({esc: escSelect.value});
    }


    // On connect to host submit
    hostForm.onsubmit = function(){
        // Check socket
        if(socketId !== undefined) {
            chrome.sockets.tcp.close(socketId, function() {
                dataAdd('Socket closed', 'ready');
                hostSubmit.value = 'Connect';
                socketId = undefined;
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

            var text = sendInput.value;
            if (escSelect.value === 'escEnable') {
                text = addESC(text);
            }
            text = addEOL(text, eolSelect.value);
            var buffer = converter.encode(text);

            chrome.sockets.tcp.send(socketId, buffer, function(res){
                dataAdd(text, 'outcoming');
                if (sendInput.value !== '') {
                    history.push(sendInput.value);
                    historyPosition = history.length;
                    sendInput.value = '';
                }
            });
        });
        
        return false;
    }

    // On incoming message
    chrome.sockets.tcp.onReceive.addListener(function(socketInfo){
        if(socketInfo.socketId !== socketId) {
            return;
        }
        var text = converter.decode(socketInfo.data);
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