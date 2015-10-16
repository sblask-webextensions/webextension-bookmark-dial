const contextMenu = require("sdk/context-menu");
const self = require("sdk/self");

const uiContextMenuDial = require("./ui-context-menu-dial");
const uiContextMenuBookmark = require("./ui-context-menu-bookmark");
const uiContextMenuPage = require("./ui-context-menu-page");

function init() {
    const mainMenu = contextMenu.Menu({
        label: "Bookmark Dial",
        image: self.data.url("icon.svg"),
        context: [
            contextMenu.PredicateContext(function() { return true; }),
        ],
    });
    uiContextMenuBookmark.addElements(mainMenu);
    uiContextMenuDial.addElements(mainMenu);
    uiContextMenuPage.addElements(mainMenu);
}

exports.init = init;
