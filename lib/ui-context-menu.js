const contextMenu = require("sdk/context-menu");
const self = require("sdk/self");

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

const dialElementContext = [
    contextMenu.URLContext(constants.URL),
    contextMenu.SelectorContext("a"),
];

const linkContext = [
    contextMenu.PredicateContext(function(context) {
        return context.linkURL &&
            context.documentURL !== constants.URL &&
            bookmarks.getBookmarkURLs().indexOf(context.linkURL) === -1;
    }),
];

const pageContext = [
    contextMenu.PredicateContext(function(context) {
        return context.documentURL &&
            context.documentURL !== constants.URL &&
            bookmarks.getBookmarkURLs().indexOf(context.documentURL) === -1;
    }),
];

function saveBookmark(data) {
    bookmarks.saveBookmark(data.title, data.url);
}

function __addLinkItem(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScript: "self.on('click', function (node, data) {" +
                "self.postMessage({title: node.textContent, url: node.href})" +
            "});",
            context: linkContext,
            label: "Add Link",
            onMessage: saveBookmark,
        })
    );
}

function __addPageItem(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScript: "self.on('click', function (node, data) {" +
                "self.postMessage({title: document.title, url: document.location.href})" +
            "});",
            context: pageContext,
            label: "Add Page",
            onMessage: saveBookmark,
        })
    );
}

function __newBookmarkItem(mainMenu) {
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

function __refreshAllItem(mainMenu) {
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

function __refreshBookmarkItem(mainMenu) {
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

function __chooseFolderItem(mainMenu) {
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

function __refreshItem(mainMenu) {
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

function __removeItem(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScript: "self.on('click', function (node, data) {" +
                "self.postMessage({id: parseInt(node.id)})" +
                "});",
            context: dialElementContext,
            label: "Remove Bookmark",
            onMessage: function(data) { bookmarks.removeBookmark(data.id); },
        })
    );
}

function init() {
    const mainMenu = contextMenu.Menu({
        label: "Bookmark Dial",
        image: self.data.url("icon.png"),
        context: [
            contextMenu.PredicateContext(function() {return true;}),
        ],
    });
    __addLinkItem(mainMenu);
    __addPageItem(mainMenu);

    __newBookmarkItem(mainMenu);
    __refreshAllItem(mainMenu);
    __refreshBookmarkItem(mainMenu);
    __chooseFolderItem(mainMenu);

    __refreshItem(mainMenu);
    __removeItem(mainMenu);
}
exports.init = init;
