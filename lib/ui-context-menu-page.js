const contextMenu = require("sdk/context-menu");
const simplePreferences = require("sdk/simple-prefs");

const bookmarks = require("./bookmarks");
const constants = require("./constants");
const uiPanels = require("./ui-panels");

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

const removeLinkContext = [
    contextMenu.SelectorContext("a"),
    contextMenu.PredicateContext(function(context) {
        return isRightContext(context, "linkURL", true);
    }),
];

const addPageContext = [
    contextMenu.PredicateContext(function(context) {
        return isRightContext(context, "documentURL", false);
    }),
];

const editOrRemovePageContext = [
    contextMenu.PredicateContext(function(context) {
        return isRightContext(context, "documentURL", true);
    }),
];

function saveBookmark(bookmarkData) {
    if (simplePreferences.prefs.useEditDialogForSavesFromPage) {
        uiPanels.openEditBookmarkPanel(
            bookmarkData,
            bookmarks.getTreeAsArray()
        );
    } else {
        bookmarks.saveBookmark(bookmarkData);
    }
}

function findBookmarkForURL(url) {
    for (let bookmark of bookmarks.getBookmarks()) {
        if (bookmark.url == url) {
            return bookmark;
        }
    }
}

function editBookmark(bookmarkData) {
    uiPanels.openEditBookmarkPanel(
        findBookmarkForURL(bookmarkData.url),
        bookmarks.getTreeAsArray()
    );
}

function removeBookmark(bookmarkData) {
    bookmarks.removeBookmark(findBookmarkForURL(bookmarkData.url));
}

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
        onMessage: saveBookmark,
    };
    mainMenu.addItem(contextMenu.Item(itemData));
}

function removeLink(mainMenu) {
    const itemData = {
        contentScript: linkContentScript,
        context: removeLinkContext,
        label: "Remove Link",
        onMessage: removeBookmark,
    };
    mainMenu.addItem(contextMenu.Item(itemData));
}

function addPage(mainMenu) {
    const itemData = {
        contentScript: pageContentScript,
        context: addPageContext,
        label: "Add Page",
        onMessage: saveBookmark,
    };
    mainMenu.addItem(contextMenu.Item(itemData));
}

function editPage(mainMenu) {
    const itemData = {
        contentScript: pageContentScript,
        context: editOrRemovePageContext,
        label: "Edit Page",
        onMessage: editBookmark,
    };
    mainMenu.addItem(contextMenu.Item(itemData));
}

function removePage(mainMenu) {
    const itemData = {
        contentScript: pageContentScript,
        context: editOrRemovePageContext,
        label: "Remove Page",
        onMessage: removeBookmark,
    };
    mainMenu.addItem(contextMenu.Item(itemData));
}

function addElements(mainMenu) {
    addLink(mainMenu);
    removeLink(mainMenu);
    addPage(mainMenu);
    editPage(mainMenu);
    removePage(mainMenu);
}

exports.addElements = addElements;
