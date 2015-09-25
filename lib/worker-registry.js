let workers = [];

exports.register = function(worker) {
    workers.push(worker);
};

exports.deregister = function(worker) {
    var index = workers.indexOf(worker);
    if (index > -1) {
        workers.splice(index, 1);
    }
};

exports.message = function(message, data) {
    for (let worker of workers.reverse()) {
        worker.port.emit(message, data);
    }
};

exports.getAvailableWorker = function() {
    return workers[0];
};
