const core = require("sdk/view/core");
const preferences = require("sdk/preferences/service");
const tabs = require("sdk/tabs");

const NewTabURL = require('resource:///modules/NewTabURL.jsm').NewTabURL;

const bookmarks = require("./lib/bookmarks");
const constants = require("./lib/constants");
const ui = require("./lib/ui");

function clearUrlBar(tab) {
    let lowLevelWindow = core.viewFor(tab.window);
    let urlBar = lowLevelWindow.document.getElementById("urlbar").inputField;
    if (urlBar.value === constants.URL) {
        urlBar.value = "";
    }
    urlBar.focus();
}

function makeContextMenu() {
    bookmarks.update(ui.bookmarkTreeToContextMenu);
}

function maybeLoadBookmarDial(tab) {
    if (tab.url == constants.URL) {
        tab.on("load", clearUrlBar);
        tab.on("load", makeContextMenu);
        tab.on("activate", clearUrlBar);
    }
}

function arePropertiesReliable(tab) {
    return tab.readyState !== "uninitialized" && tab.readyState !== "loading";
}

function onTabOpen(tab) {
    if (arePropertiesReliable(tab)) {
        maybeLoadBookmarDial(tab);
    } else {
        tab.on("ready", maybeLoadBookmarDial);
    }
}

preferences.set("browser.startup.homepage", "about:newtab");
NewTabURL.override(constants.URL);
tabs.on("open", onTabOpen);
