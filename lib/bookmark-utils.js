const constants = require("./constants");

function isDefaultBookmarkItem(item) {
    return constants.DEFAULT_BOOKMARK_FOLDERS.indexOf(item) > -1;
}
exports.isDefaultBookmarkItem = isDefaultBookmarkItem;

function isFolder(item) {
    return item.bookmarkItem.type === "group";
}
exports.isFolder = isFolder;

function __getProperties(bookmarkItem) {
    if (isDefaultBookmarkItem(bookmarkItem)) {
        return constants.DEFAULT_FOLDER_DATA[bookmarkItem.title];
    } else {
        return {
            label: bookmarkItem.title,
        };
    }
}

function __isSubTree(child) {
    let children = child.children;
    return children && children.length > 0 && isFolder(children[0]);
}

function treeToArray(tree, path) {
    path = path || "";
    let folders = [];
    for (let child of tree.children) {
        if (isFolder(child)) {
            let properties = __getProperties(child.bookmarkItem);
            let currentPath = path + child.bookmarkItem.title + "/";
            folders.push([currentPath, properties.label, properties.image]);
            if (__isSubTree(child)) {
                folders = folders.concat(treeToArray(child, currentPath));
            }
        }
    }
    return folders;
}
exports.treeToArray = treeToArray;
