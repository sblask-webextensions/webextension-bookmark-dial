const bookmarks = require("sdk/places/bookmarks");
const simplePreferences = require("sdk/simple-prefs");
const timers = require("sdk/timers");

const bookmarkUtils = require("./bookmark-utils");
const constants = require("./constants");
const thumbnail = require("./thumbnail");
const thumbnailStorage = require("./thumbnail-storage");

let bookmarkTree;
let preferences = simplePreferences.prefs;
let updateListeners = {
    bookmarksUpdated: [],
};

function __thumbnailStorageOverQuotaHandler() {
    thumbnailStorage.cleanupAllBut(getBookmarkURLs());
}
thumbnailStorage.registerOverQuotaHandler(__thumbnailStorageOverQuotaHandler);

function on(event, someFunction) {
    updateListeners[event].push(someFunction);
}
exports.on = on;

function getTreeAsArray() {
    if (!bookmarkTree) {
        return update(function(){ getTreeAsArray(); });
    }
    return bookmarkUtils.treeToArray(bookmarkTree);
}
exports.getTreeAsArray = getTreeAsArray;

function __saveAndUpdate(bookmark) {
    bookmarks.save(bookmark).on("end", function() {update();});
}

function saveBookmark(data) {
    if (!bookmarkTree) {
        return update(function(){ saveBookmark(data); });
    }
    data.group = getGroupForPath(data.group);
    if (data.tags) {
        data.tags = data.tags.split(",");
    }
    console.dir("Save bookmark", data);
    __saveAndUpdate(bookmarks.Bookmark(data));
}
exports.saveBookmark = saveBookmark;

function getBookmarks(path) {
    if (!bookmarkTree) {
        return update(function(){ getBookmarks(path); });
    }
    let bookmarks = __getBookmarksForFolder(__getFolderForPath(path));
    let bookmarkURLsWithoutThumbnail = [];
    for (let bookmark of bookmarks) {
        let thumbnail = thumbnailStorage.getThumbnail(bookmark.url);
        if (!thumbnail) {
            bookmarkURLsWithoutThumbnail.push(bookmark.url);
        }
        bookmark.thumbnail = thumbnail || "empty.png";
    }
    let generateMissingThumbnails = function(){
        thumbnail.updateThumbnails(bookmarkURLsWithoutThumbnail);
    };
    timers.setTimeout(generateMissingThumbnails, 100);
    return bookmarks;
}
exports.getBookmarks = getBookmarks;

function getBookmarkURLs(path) {
    if (!bookmarkTree) {
        return update(function(){ getBookmarkURLs(path); });
    }
    let bookmarks = __getBookmarksForFolder(__getFolderForPath(path));
    let bookmarkURLs = [];
    for (let bookmark of bookmarks) {
        bookmarkURLs.push(bookmark.url);
    }
    return bookmarkURLs;
}
exports.getBookmarkURLs = getBookmarkURLs;

function getGroupForPath(path) {
    return __getFolderForPath(path).bookmarkItem;
}
exports.getGroupForPath = getGroupForPath;

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
            if (bookmarkUtils.isFolder(child) && child.bookmarkItem.title === currentFolder) {
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
                id: child.bookmarkItem.id,
                index: child.bookmarkItem.index,
                tags: [...(child.bookmarkItem.tags)],
                title: child.bookmarkItem.title,
                url: child.bookmarkItem.url,
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
exports.update = update;

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

function removeBookmark(id) {
    console.log("Remove bookmark", id);
    let bookmarkToDelete = bookmarks.remove(bookmarks.Bookmark({
        id: id,
        title:"dummy",
        url: "http://www.example.com",
    }));
    __saveAndUpdate(bookmarkToDelete);
}
exports.removeBookmark = removeBookmark;

function updateThumbnail(url) {
    thumbnail.updateThumbnails([url]);
}
exports.updateThumbnail = updateThumbnail;

function updateAllThumbnails() {
    thumbnail.updateThumbnails(getBookmarkURLs());
}
exports.updateAllThumbnails = updateAllThumbnails;

function shutdown() {
    thumbnail.stopGeneration();
}
exports.shutdown = shutdown;
