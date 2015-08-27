/* globals window, self */
/* jshint unused: false */
self.on("click", function (node, data) {
    self.postMessage(data);
});
