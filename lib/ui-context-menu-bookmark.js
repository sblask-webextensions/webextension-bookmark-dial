const contextMenu = require("sdk/context-menu");

const bookmarks = require("./bookmarks");
const constants = require("./constants");
const uiPanels = require("./ui-panels");

const dialElementContext = [
    contextMenu.URLContext(constants.URL),
    contextMenu.SelectorContext("a"),
];

function editBookmark(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScriptFile: "./bookmark-data.js",
            contentScript: "self.on('click', function (node, data) {" +
                "self.postMessage(getBookmarkDataForNode(node))" +
            "});",
            context: dialElementContext,
            label: "Edit Bookmark",
            onMessage: function(data) { uiPanels.openEditBookmarkPanel(data, bookmarks.getTreeAsArray()); },
        })
    );
}

function refreshThumbnail(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScript: "self.on('click', function (node, data) {" +
                "self.postMessage({url: node.href})" +
            "});",
            context: dialElementContext,
            label: "Refresh Thumbnail",
            onMessage: function(data) { bookmarks.updateThumbnail(data.url); },
        })
    );
}

function removeBookmark(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScriptFile: "./bookmark-data.js",
            contentScript: "self.on('click', function (node, data) {" +
                "self.postMessage(getBookmarkDataForNode(node))" +
            "});",
            context: dialElementContext,
            label: "Remove Bookmark",
            onMessage: function(data) { bookmarks.removeBookmark(data); },
        })
    );
}


function addElements(mainMenu) {
    editBookmark(mainMenu);
    refreshThumbnail(mainMenu);
    removeBookmark(mainMenu);
}
exports.addElements = addElements;
