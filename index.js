const core = require("sdk/view/core");
const file = require("sdk/io/file");
const pageMod = require("sdk/page-mod");
const preferences = require("sdk/preferences/service");
const self = require("sdk/self");
const simplePreferences = require('sdk/simple-prefs');

const NewTabURL = require('resource:///modules/NewTabURL.jsm').NewTabURL;

const bookmarks = require("./lib/bookmarks");
const constants = require("./lib/constants");
const ui = require("./lib/ui");
const workerRegistry = require("./lib/worker-registry");

function clearUrlBar(tab) {
    // does not always seem to be available with private browsing
    if (tab.window) {
        let lowLevelWindow = core.viewFor(tab.window);
        let urlBar = lowLevelWindow.document.getElementById("urlbar").inputField;
        if (urlBar.value === constants.URL) {
            urlBar.value = "";
        }
        urlBar.focus();
    }
}

function updateDial() {
    let folder = simplePreferences.prefs.bookmarkFolder;
    if (folder) {
        workerRegistry.message("bookmarksUpdated", bookmarks.getBookmarks(folder));
    }
}

function __getStyleString() {
    //  cannot use href for local file as file:// does not work,
    //  so load file directly using the appropriate functions
    let useCustomStyleFile = simplePreferences.prefs.useCustomStyleFile;
    let customStyleFile = simplePreferences.prefs.customStyleFile;
    if (useCustomStyleFile && customStyleFile && file.exists(customStyleFile)) {
        return file.read(customStyleFile);
    } else {
        return self.data.load("./bookmark_dial.css");
    }
}

function updateStyle(worker) {
    let message = "styleUpdated";
    let data = __getStyleString();
    if (worker) {
        worker.port.emit(message, data);
    } else {
        workerRegistry.message(message, data);
    }
}

// hijack homepage and new tab page
preferences.set("browser.startup.homepage", "about:newtab");
NewTabURL.override(constants.URL);

// initialize the ui parts that don't need bookmarks yet
ui.init();

// setup listeners
bookmarks.on("bookmarksUpdated", ui.bookmarkTreeToContextMenu);
bookmarks.on("bookmarksUpdated", updateDial);
simplePreferences.on("bookmarkFolder", updateDial);
simplePreferences.on("customStyleFile", function() {updateStyle();});
simplePreferences.on("useCustomStyleFile", function() {updateStyle();});

pageMod.PageMod({
    include: constants.URL,
    attachTo: ["existing", "top"],
    contentScriptOptions: { THUMBNAIL_WIDTH: constants.THUMBNAIL_WIDTH },
    contentScriptFile: [
        "./jquery-2.1.4.js",
        "./underscore-1.8.3.js",
        "./bookmark_dial.js",
    ],
    onAttach: function(worker) {
        console.log("Attach");
        worker.on('detach', function () {
            console.log("Detach");
            workerRegistry.deregister(this);
        });
        workerRegistry.register(worker);
        clearUrlBar(worker.tab);
        worker.tab.on("activate", clearUrlBar);
        worker.tab.on("pageshow", clearUrlBar);
        worker.port.emit("init");
        updateStyle(worker);
        bookmarks.update();
    }
});

