const bookmarks = require("sdk/places/bookmarks");

const constants = require("./constants");

let bookmarkTree;
let updateListeners = {
    update: []
};

function on(event, someFunction) {
    updateListeners[event].push(someFunction);
}

function isDefaultBookmarkItem(item) {
    return constants.DEFAULT_BOOKMARK_FOLDERS.indexOf(item) > -1;
}

function isFolder(item) {
    return item.bookmarkItem.type === "group";
}

function getBookmarks(path) {
    let pathSegments = path.split("/").filter(Boolean);
    let folder = __getFolderForPath(pathSegments, [bookmarkTree]);
    return __getBookmarksForFolder(folder);
}

function __getFolderForPath(segments, matches) {
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
    return __getFolderForPath(segments, children);
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

function update() {
    console.log("Update bookmark data");
    __aggregate(constants.FOLDER_QUERYS.slice(), [])([]);
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

function __resultHandler(results) {
    let updatedTree = {parent: undefined, children: []};
    let wrapped = __wrapResults(results);
    __buildTree(updatedTree, wrapped);
    bookmarkTree = updatedTree;

    for (let someFunction of updateListeners.update) {
        someFunction(bookmarkTree);
    }
}

function __aggregate(queries, accumulator) {
    return function(results) {
        accumulator = accumulator.concat(results);
        let query = queries.shift();
        if (query) {
            accumulator.push(query.group);
            bookmarks
                .search(query)
                .on("end", __aggregate(queries, accumulator));
        } else {
            return __resultHandler(accumulator);
        }
    };
}

exports.getBookmarks = getBookmarks;
exports.isDefaultBookmarkItem = isDefaultBookmarkItem;
exports.isFolder = isFolder;
exports.on = on;
exports.update = update;
