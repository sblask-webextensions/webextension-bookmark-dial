const contextMenu = require("sdk/context-menu");
const simplePreferences = require('sdk/simple-prefs');

const bookmarks = require("./bookmarks");
const constants = require("./constants");

let mainMenu;
let preferences = simplePreferences.prefs;

const clickProperties = {
    contentScriptFile: "./context_menu_click.js",
    onMessage: updatePreference,
};

function updatePreference(path) {
    preferences.bookmarkFolder = path;
}

function newItem(properties) {
    return contextMenu.Item(Object.assign({}, properties, clickProperties));
}

function getProperties(bookmarkItem) {
    if (bookmarks.isDefaultBookmarkItem(bookmarkItem)) {
        return constants.DEFAULT_FOLDER_DATA[bookmarkItem.title];
    } else {
        return {
            label: bookmarkItem.title,
        };
    }
}

function buildContextMenu(menu, tree, path) {
    for (let child of tree.children) {
        if (bookmarks.isFolder(child)) {
            let properties = getProperties(child.bookmarkItem);
            let currentPath = path + child.bookmarkItem.title + "/";
            properties.data = currentPath;
            if (child.children &&
                child.children.length > 0 &&
                bookmarks.isFolder(child.children[0])
               ) {
                let subMenu = contextMenu.Menu(properties);
                menu.addItem(subMenu);
                buildContextMenu(subMenu, child, currentPath);
            } else {
                menu.addItem(newItem(properties));
            }
        }
    }
}

function assertMainMenu() {
    if (!mainMenu) {
        mainMenu = contextMenu.Menu({
            label: "Choose Bookmark Folder",
            context: contextMenu.URLContext(constants.URL),
        });
    }
}

function clearMainMenu() {
    for (let item of mainMenu.items) {
        mainMenu.removeItem(item);
    }
}

exports.bookmarkTreeToContextMenu = function(tree) {
    assertMainMenu();
    clearMainMenu();
    buildContextMenu(mainMenu, tree, "/");
};
