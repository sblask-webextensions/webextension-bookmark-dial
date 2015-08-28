const bookmarks = require("sdk/places/bookmarks");

const constants = require("./constants");

let bookmarkTree;

function isDefaultBookmarkItem(item) {
    return constants.DEFAULT_BOOKMARK_FOLDERS.indexOf(item) > -1;
}

function wrapResults(results) {
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

function isChild(item, potentialParent) {
    let group = item.bookmarkItem.group;
    return group && group === potentialParent.bookmarkItem;
}

function findParent(item, currentNode) {
    if (isChild(item, currentNode)) {
        return currentNode;
    }
    let parent = currentNode.parent;
    if (!parent) {
        return currentNode;
    }
    return findParent(item, parent);
}

function buildTree(tree, list) {
    let currentNode = tree;
    while (list.length > 0) {
        let item = list.shift();
        // go back up in tree
        if (!isChild(item, currentNode)) {
            currentNode = findParent(item, currentNode);
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

function resultHandler(results, doneFunction) {
    let updatedTree = {parent: undefined, children: []};
    let wrapped = wrapResults(results);
    buildTree(updatedTree, wrapped);
    bookmarkTree = updatedTree;
    doneFunction(bookmarkTree);
}

function aggregate(queries, accumulator, doneFunction) {
    return function(results) {
        accumulator = accumulator.concat(results);
        let query = queries.shift();
        if (query) {
            accumulator.push(query.group);
            bookmarks
                .search(query)
                .on("end", aggregate(queries, accumulator, doneFunction));
        } else {
            return resultHandler(accumulator, doneFunction);
        }
    };
}

exports.isDefaultBookmarkItem = isDefaultBookmarkItem;

exports.isFolder = function(item) {
    return item.bookmarkItem.type === "group";
};

exports.update = function(doneFunction) {
    aggregate(constants.FOLDER_QUERYS.slice(), [], doneFunction)([]);
};
