const core = require("sdk/view/core");
const file = require("sdk/io/file");
const preferences = require("sdk/preferences/service");
const self = require("sdk/self");
const simplePreferences = require('sdk/simple-prefs');
const tabs = require("sdk/tabs");

const NewTabURL = require('resource:///modules/NewTabURL.jsm').NewTabURL;

const bookmarks = require("./lib/bookmarks");
const constants = require("./lib/constants");
const ui = require("./lib/ui");
const workerRegistry = require("./lib/worker-registry");

function clearUrlBar(tab) {
    let lowLevelWindow = core.viewFor(tab.window);
    let urlBar = lowLevelWindow.document.getElementById("urlbar").inputField;
    if (urlBar.value === constants.URL) {
        urlBar.value = "";
    }
    urlBar.focus();
}

function attachFiles(tab) {
     let worker = tab.attach({
        contentScriptFile: [
            "./jquery-2.1.4.js",
            "./bookmark_dial.js",
        ],
    });
    workerRegistry.register(tab, worker);
    updateStyle();
}

function maybeLoadBookmarDial(tab) {
    if (tab.url == constants.URL) {
        tab.on("load", clearUrlBar);
        tab.on("activate", clearUrlBar);
        tab.on("load", bookmarks.update);
        tab.on("close", workerRegistry.deregister);
        attachFiles(tab);
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

function updateDial() {
    let folder = simplePreferences.prefs.bookmarkFolder;
    if (folder) {
        workerRegistry.message("update", bookmarks.getBookmarks(folder));
    }
}

function __getStyleString() {
    let customStyleFile = simplePreferences.prefs.customStyleFile;
    if (simplePreferences.prefs.useCustomStyleFile &&
        customStyleFile && file.exists(customStyleFile)) {
        return file.read(simplePreferences.prefs.customStyleFile);
    } else {
        return self.data.load("./bookmark_dial.css");
    }
}

function updateStyle() {
    //  cannot use href for local file as file:// does not work,
    //  so load file directly using the appropriate functions
    workerRegistry.message("styleUpdate", __getStyleString());
}

// hijack homepage and new tab page
preferences.set("browser.startup.homepage", "about:newtab");
NewTabURL.override(constants.URL);
// setup listeners
bookmarks.on("update", ui.bookmarkTreeToContextMenu);
bookmarks.on("update", updateDial);
simplePreferences.on("bookmarkFolder", updateDial);
simplePreferences.on("customStyleFile", updateStyle);
simplePreferences.on("useCustomStyleFile", updateStyle);
// init for the right tabs
tabs.on("open", onTabOpen);
