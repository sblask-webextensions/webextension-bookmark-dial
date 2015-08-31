/* globals self */
/* jshint jquery:true */

self.port.on("styleUpdate", function(styleString) {
    console.log("Update style");
    $('style').text(styleString);
});

self.port.on("update", function(bookmarks) {
    console.log("Update " + bookmarks.length + " bookmarks");
});
