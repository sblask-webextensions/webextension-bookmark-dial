const contextMenu = require("sdk/context-menu");

const bookmarks = require("./bookmarks");
const constants = require("./constants");

const linkContentScript = `self.on('click', function (node, data) {
    self.postMessage({title: node.textContent, url: node.href})
});`;

const pageContentScript = `self.on('click', function (node, data) {
    self.postMessage({title: document.title, url: document.location.href})
});`;

const addLinkContext = [
    contextMenu.SelectorContext("a"),
    contextMenu.PredicateContext(function(context) {
        return isRightContext(context, "linkURL", false);
    }),
];

const addPageContext = [
    contextMenu.PredicateContext(function(context) {
        return isRightContext(context, "documentURL", false);
    }),
];

function isRightContext(context, urlAttribute, urlShouldBeBookmarked) {
    const url = context[urlAttribute];
    if (!url) {
        return false;
    }

    const bookmarkURLs = bookmarks.getBookmarkURLs();
    if (!bookmarkURLs) {
        return false;
    }

    const isDial = context.documentURL == constants.URL;
    const isBookmark = bookmarkURLs.indexOf(url) !== -1;
    return !isDial && (urlShouldBeBookmarked ? isBookmark : !isBookmark);
}

function addLink(mainMenu) {
    const itemData = {
        contentScript: linkContentScript,
        context: addLinkContext,
        label: "Add Link",
        onMessage: bookmarks.saveBookmark,
    };
    mainMenu.addItem(contextMenu.Item(itemData));
}

function addPage(mainMenu) {
    const itemData = {
        contentScript: pageContentScript,
        context: addPageContext,
        label: "Add Page",
        onMessage: bookmarks.saveBookmark,
    };
    mainMenu.addItem(contextMenu.Item(itemData));
}

function addElements(mainMenu) {
    addLink(mainMenu);
    addPage(mainMenu);
}

exports.addElements = addElements;
