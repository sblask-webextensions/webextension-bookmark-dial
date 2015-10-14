const contextMenu = require("sdk/context-menu");

const bookmarks = require("./bookmarks");
const constants = require("./constants");
const uiPanels = require("./ui-panels");

const dialContext = [
    contextMenu.URLContext(constants.URL),
    contextMenu.PredicateContext(function(context) {
        let validTargets = ["body", "li", "ol"];
        return validTargets.indexOf(context.targetName) !== -1;
    }),
];

function newBookmark(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScript: "self.on('click', function (node, data) {" +
                "self.postMessage({})" +
            "});",
            context: dialContext,
            label: "New Bookmark",
            onMessage: function() { uiPanels.openEditBookmarkPanel({}, bookmarks.getTreeAsArray()); },
        })
    );
}

function refreshThumbnails(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScript: "self.on('click', function (node, data) {" +
                "self.postMessage({})" +
            "});",
            context: dialContext,
            label: "Refresh Thumbnails",
            onMessage: function() { bookmarks.updateAllThumbnails(); },
        })
    );
}

function refreshBookmarks(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScript: "self.on('click', function (node, data) {" +
                "self.postMessage({})" +
            "});",
            context: dialContext,
            label: "Refresh Bookmarks",
            onMessage: function() { bookmarks.update(); },
        })
    );
}

function chooseFolder(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScript: "self.on('click', function () {" +
                "self.postMessage({})" +
            "});",
            context: dialContext,
            label: "Choose Folder",
            onMessage: function() { uiPanels.openChooseFolderPanel(bookmarks.getTreeAsArray()); },
        })
    );
}

function addElements(mainMenu) {
    newBookmark(mainMenu);
    refreshThumbnails(mainMenu);
    refreshBookmarks(mainMenu);
    chooseFolder(mainMenu);
}

exports.addElements = addElements;
