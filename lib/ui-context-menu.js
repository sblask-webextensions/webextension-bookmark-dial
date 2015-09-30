const contextMenu = require("sdk/context-menu");
const self = require("sdk/self");

const bookmarks = require("./bookmarks");
const constants = require("./constants");
const uiPanels = require("./ui-panels");

function saveBookmark(data) {
    bookmarks.saveBookmark(data.title, data.url);
}

function __addLinkItem(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScript: 'self.on("click", function (node, data) {' +
                'self.postMessage({title: node.textContent, url: node.href})' +
                '});',
            context: [
                contextMenu.URLContext("*"),
                contextMenu.SelectorContext("a"),
            ],
            label: "Add Link",
            onMessage: saveBookmark,
        })
    );
}

function __addPageItem(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScript: 'self.on("click", function (node, data) {' +
                'self.postMessage({title: document.title, url: document.location.href})' +
                '});',
            context: [
                contextMenu.URLContext("*"),
            ],
            label: "Add Page",
            onMessage: saveBookmark,
        })
    );
}

function __refreshItem(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScript: 'self.on("click", function (node, data) {' +
                'self.postMessage({url: node.href})' +
            '});',
            context: [
                contextMenu.URLContext(constants.URL),
                contextMenu.SelectorContext("a"),
            ],
            label: "Refresh Thumbnail",
            onMessage: function(data) { bookmarks.updateThumbnail(data.url); },
        })
    );
}

function __refreshAllItem(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScript: 'self.on("click", function (node, data) {' +
                'self.postMessage({})' +
            '});',
            context: [
                contextMenu.URLContext(constants.URL),
            ],
            label: "Refresh all Thumbnails",
            onMessage: function() { bookmarks.updateAllThumbnails(); },
        })
    );
}

function __refreshBookmarkItem(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScript: 'self.on("click", function (node, data) {' +
                'self.postMessage({})' +
            '});',
            context: [
                contextMenu.URLContext(constants.URL),
            ],
            label: "Refresh Bookmarks",
            onMessage: function() { bookmarks.update(); },
        })
    );
}

function __removeItem(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScript: 'self.on("click", function (node, data) {' +
                'self.postMessage({id: parseInt(node.id)})' +
                '});',
            context: [
                contextMenu.URLContext(constants.URL),
                contextMenu.SelectorContext("a"),
            ],
            label: "Remove Bookmark",
            onMessage: function(data) { bookmarks.removeBookmark(data.id); },
        })
    );
}

function __chooseFolderItem(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScript: 'self.on("click", function () {' +
                'self.postMessage({})' +
            '});',
            context: [
                contextMenu.URLContext(constants.URL),
            ],
            label: "Choose Folder",
            onMessage: function() { uiPanels.openChooseFolderPanel(bookmarks.getTreeAsArray()); },
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
    __refreshItem(mainMenu);
    __refreshAllItem(mainMenu);
    __refreshBookmarkItem(mainMenu);
    __removeItem(mainMenu);
    __chooseFolderItem(mainMenu);
}
exports.init = init;
