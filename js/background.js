chrome.app.runtime.onLaunched.addListener(function(launchData) {
    chrome.app.window.create('index.html', {
        id: "sockettester_mainwindow",
        singleton: true
    }, function(win) {
        win.onClosed.addListener(function() {
            chrome.sockets.tcp.SocketInfo(function(connections) {
                connections.forEach(function(c) {
                    chrome.sockets.tcp.close(c.socketId, function() { });
                });
            });
        });
    });
});
