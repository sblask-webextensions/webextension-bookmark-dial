const bookmarks = require("sdk/places/bookmarks");
const simplePreferences = require('sdk/simple-prefs');

const constants = require("./constants");
const thumbnail = require("./thumbnail");
const thumbnailStorage = require("./thumbnail-storage");

let bookmarkTree;
let preferences = simplePreferences.prefs;
let updateListeners = {
    bookmarksUpdated: []
};

function thumbnailStorageOverQuotaHandler() {
    thumbnailStorage.cleanupAllBut(__getBookmarkURLs());
}
thumbnailStorage.registerOverQuotaHandler(thumbnailStorageOverQuotaHandler);

function on(event, someFunction) {
    updateListeners[event].push(someFunction);
}

function isDefaultBookmarkItem(item) {
    return constants.DEFAULT_BOOKMARK_FOLDERS.indexOf(item) > -1;
}

function isFolder(item) {
    return item.bookmarkItem.type === "group";
}

function saveBookmark(title, url) {
    if (!bookmarkTree) {
        return update(function(){saveBookmark(title, url);});
    }
    console.log("Save bookmark", title, url);
    let group = __getFolderForPath().bookmarkItem;
    let newBookmark = bookmarks.Bookmark({
        group: group,
        title: title,
        url: url,
    });
    bookmarks.save(newBookmark).on("end", function() {update();});
}

function getBookmarks(path) {
    let bookmarks = __getBookmarksForFolder(__getFolderForPath(path));
    for (let bookmark of bookmarks) {
        bookmark.thumbnail = thumbnailStorage.getThumbnail(bookmark.url);
    }
    return bookmarks;
}

function __getBookmarkURLs(path) {
    let bookmarks = __getBookmarksForFolder(__getFolderForPath(path));
    let bookmarkURLs = [];
    for (let bookmark of bookmarks) {
        bookmarkURLs.push(bookmark.url);
    }
    return bookmarkURLs;
}

function __getFolderForPath(path) {
    path = path || preferences.bookmarkFolder;
    if (!path) {
        return [];
    }
    let pathSegments = path.split("/").filter(Boolean);
    return __getFolderForPathSegments(pathSegments, [bookmarkTree]);
}

function __getFolderForPathSegments(segments, matches) {
    if (segments.length === 0) {
        return matches[0];
    }

    let currentFolder = segments.shift();
    let children = [];
    for (let match of matches) {
        for (let child of match.children) {
            if (isFolder(child) && child.bookmarkItem.title === currentFolder) {
                children.push(child);
            }
        }
    }
    return __getFolderForPathSegments(segments, children);
}

function __getBookmarksForFolder(item) {
    if (!item) {
        return [];
    }
    let result = [];
    for (let child of item.children) {
        if (child.bookmarkItem.type === "bookmark") {
            let bookmark = {
                title: child.bookmarkItem.title,
                url: child.bookmarkItem.url,
                index: child.bookmarkItem.index,
            };
            result.push(bookmark);
        }
    }
    return result;
}

function update(callback) {
    console.log("Update bookmark data");
    __aggregate(constants.FOLDER_QUERYS.slice(), [], callback)([]);
}

function __wrapResults(results) {
    let wrappedResults = [];
    for (let item of results) {
        if (item.type === "bookmark" || item.type === "group") {
            let wrappedItem = {
                children: [],
                bookmarkItem: item,
            };
            wrappedResults.push(wrappedItem);
        }
    }
    return wrappedResults;
}

function __isChild(item, potentialParent) {
    let group = item.bookmarkItem.group;
    return group && group === potentialParent.bookmarkItem;
}

function __findParent(item, currentNode) {
    if (__isChild(item, currentNode)) {
        return currentNode;
    }
    let parent = currentNode.parent;
    if (!parent) {
        return currentNode;
    }
    return __findParent(item, parent);
}

function __buildTree(tree, list) {
    let currentNode = tree;
    while (list.length > 0) {
        let item = list.shift();
        // go back up in tree
        if (!__isChild(item, currentNode)) {
            currentNode = __findParent(item, currentNode);
        }
        item.parent = currentNode;
        currentNode.children.push(item);
        // go deeper into tree
        if (item.bookmarkItem.type === "group") {
            currentNode = item;
        }
    }
    return tree;
}

function __resultHandler(results, callback) {
    let updatedTree = {parent: undefined, children: []};
    let wrapped = __wrapResults(results);
    __buildTree(updatedTree, wrapped);
    bookmarkTree = updatedTree;
    if (callback) {
        callback(bookmarkTree);
    }
    for (let someFunction of updateListeners.bookmarksUpdated) {
        someFunction(bookmarkTree);
    }
}

function __aggregate(queries, accumulator, callback) {
    return function(results) {
        accumulator = accumulator.concat(results);
        let query = queries.shift();
        if (query) {
            accumulator.push(query.group);
            bookmarks
                .search(query)
                .on("end", __aggregate(queries, accumulator, callback));
        } else {
            return __resultHandler(accumulator, callback);
        }
    };
}

function updateThumbnail(url) {
    thumbnail.updateThumbnails([url]);
}

function updateAllThumbnails() {
    thumbnail.updateThumbnails(__getBookmarkURLs());
}

exports.getBookmarks = getBookmarks;
exports.isDefaultBookmarkItem = isDefaultBookmarkItem;
exports.isFolder = isFolder;
exports.on = on;
exports.saveBookmark = saveBookmark;
exports.update = update;
exports.updateThumbnail = updateThumbnail;
exports.updateAllThumbnails = updateAllThumbnails;
