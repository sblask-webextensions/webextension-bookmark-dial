const contextMenu = require("sdk/context-menu");
const data = require("sdk/self").data;

const bookmarks = require("./bookmarks");
const constants = require("./constants");

let mainMenu;

const clickProperties = {
    contentScriptFile: "./context_menu_click.js",
    onMessage: onClick,
};

function onClick(data) {
    console.log(data);
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

function buildContextMenu(menu, tree) {
    for (let child of tree.children) {
        let properties = getProperties(child.bookmarkItem);
        if (child.children.length > 0) {
            let subMenu = contextMenu.Menu(properties);
            menu.addItem(subMenu);
            buildContextMenu(subMenu, child);
        } else {
            menu.addItem(newItem(properties));
        }
    }
}

function assertMainMenu() {
    if (!mainMenu) {
        mainMenu = contextMenu.Menu({
            label: "Choose Bookmark Folder",
            context: contextMenu.URLContext(data.url("bookmark_dial.html")),
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
    buildContextMenu(mainMenu, tree);
};
