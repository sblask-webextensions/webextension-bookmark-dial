const contextMenu = require("sdk/context-menu");
const self = require("sdk/self");
const simplePreferences = require('sdk/simple-prefs');

const bookmarks = require("./bookmarks");
const constants = require("./constants");

let mainMenu;
let chooseMenu;
let preferences = simplePreferences.prefs;

function updatePreference(path) {
    preferences.bookmarkFolder = path;
}

function saveBookmark(data) {
    bookmarks.saveBookmark(data.title, data.url);
}

function newItem(properties) {
    let clickProperties = {
        contentScript: 'self.on("click", function (node, data) {' +
            'self.postMessage(data)' +
        '});',
        onMessage: updatePreference,
    };
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

function __addPageItem(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScript: 'self.on("click", function (node, data) {' +
                'self.postMessage({title: document.title, url: document.location.href})' +
                '});',
            context: contextMenu.URLContext("*"),
            label: "Add Page",
            onMessage: saveBookmark,
        })
    );
}

function __addLinkItem(mainMenu) {
    mainMenu.addItem(
        contextMenu.Item({
            contentScript: 'self.on("click", function (node, data) {' +
                'self.postMessage({title: node.innerHTML, url: node.href})' +
                '});',
            context: [contextMenu.URLContext("*"), contextMenu.SelectorContext("a")],
            label: "Add Link",
            onMessage: saveBookmark,
        })
    );
}

function assertMainMenu() {
    if (!mainMenu) {
        mainMenu = contextMenu.Menu({
            label: "Bookmark Dial",
            image: self.data.url("icon.png"),
            context: contextMenu.PredicateContext(function() {return true;}),
        });

        chooseMenu = contextMenu.Menu({
            label: "Choose Folder",
            context: contextMenu.URLContext(constants.URL),
        });
        mainMenu.addItem(chooseMenu);

        __addLinkItem(mainMenu);
        __addPageItem(mainMenu);
    }
}

function clearChooseMenu() {
    for (let item of chooseMenu.items) {
        chooseMenu.removeItem(item);
    }
}

exports.bookmarkTreeToContextMenu = function(tree) {
    assertMainMenu();
    clearChooseMenu();
    buildContextMenu(chooseMenu, tree, "/");
};
exports.init = function() {
    assertMainMenu();
};
