const bookmarks = require("sdk/places/bookmarks");

const constants = require("./constants");

function isDefaultBookmarkItem(item) {
    return constants.DEFAULT_BOOKMARK_FOLDERS.indexOf(item) > -1;
}
exports.isDefaultBookmarkItem = isDefaultBookmarkItem;

function resultsToFolders(results) {
    let folders = [];
    for (let result of results) {
        if (result.type === "group" || isDefaultBookmarkItem(result)) {

            folders.push(
                {
                    bookmarkItem: result,
                    children: [],
                });
        }
    }
    return folders;
}

function resultHandler(results, doneFunction) {
    let tree = {children: []};
    let lastSeenParent;
    let orphans = [];
    let folders = resultsToFolders(results);
    for (let folder of folders.reverse()) {
        if (folder.bookmarkItem === lastSeenParent) {
            folder.children = orphans.reverse();
            orphans = [];
        }
        if (isDefaultBookmarkItem(folder.bookmarkItem)) {
            tree.children.push(folder);
        } else {
            orphans.push(folder);
            lastSeenParent = folder.bookmarkItem.group;
        }
    }
    tree.children.reverse();
    doneFunction(tree);
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

exports.getFolders = function(doneFunction) {
    aggregate(constants.FOLDER_QUERYS.slice(), [], doneFunction)([]);
};
