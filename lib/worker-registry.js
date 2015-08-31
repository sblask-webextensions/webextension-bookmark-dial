let bookmark_dial_workers = {};

exports.register = function(tab, worker) {
    bookmark_dial_workers[tab.id] = worker;
};

exports.deregister = function(tab) {
    delete bookmark_dial_workers[tab.id];
};

exports.message = function(message, data) {
    for (let tabId in bookmark_dial_workers) {
        let worker = bookmark_dial_workers[tabId];
        worker.port.emit(message, data);
    }
};
