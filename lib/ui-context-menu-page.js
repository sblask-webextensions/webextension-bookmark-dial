const contextMenu = require("sdk/context-menu");

const bookmarks = require("./bookmarks");
const constants = require("./constants");

const linkContext = [
    contextMenu.PredicateContext(function(context) {
        const bookmarkURLs = bookmarks.getBookmarkURLs();
        return context.documentURL !== constants.URL &&
            bookmarkURLs &&
            context.linkURL &&
            bookmarkURLs.indexOf(context.linkURL) === -1;
    }),
];

const pageContext = [
    contextMenu.PredicateContext(function(context) {
        const bookmarkURLs = bookmarks.getBookmarkURLs();
        return context.documentURL !== constants.URL &&
            bookmarkURLs &&
            context.documentURL &&
            bookmarkURLs.indexOf(context.documentURL) === -1;
    }),
];

function addLink(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScript: "self.on('click', function (node, data) {" +
                "self.postMessage({title: node.textContent, url: node.href})" +
            "});",
            context: linkContext,
            label: "Add Link",
            onMessage: bookmarks.saveBookmark,
        })
    );
}

function addPage(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScript: "self.on('click', function (node, data) {" +
                "self.postMessage({title: document.title, url: document.location.href})" +
            "});",
            context: pageContext,
            label: "Add Page",
            onMessage: bookmarks.saveBookmark,
        })
    );
}

function addElements(mainMenu) {
    addLink(mainMenu);
    addPage(mainMenu);
}

exports.addElements = addElements;
