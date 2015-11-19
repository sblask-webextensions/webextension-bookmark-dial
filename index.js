const core = require("sdk/view/core");
const file = require("sdk/io/file");
const pageMod = require("sdk/page-mod");
const preferences = require("sdk/preferences/service");
const self = require("sdk/self");
const simplePreferences = require("sdk/simple-prefs");
const timers = require("sdk/timers");

const NewTabURL = require("resource:///modules/NewTabURL.jsm").NewTabURL;

const bookmarks = require("./lib/bookmarks");
const constants = require("./lib/constants");
const uiContextMenu = require("./lib/ui-context-menu");
const uiPanels = require("./lib/ui-panels");
const workerRegistry = require("./lib/worker-registry");

function __offThreadClearURLBar(tab) {
    timers.setTimeout(function() { __clearUrlBar(tab); }, 1);
}

function __clearUrlBar(tab) {
    // does not always seem to be available with private browsing
    if (tab.window) {
        let lowLevelWindow = core.viewFor(tab.window);
        let urlBar = lowLevelWindow.document.getElementById("urlbar").inputField;
        if (urlBar.value.startsWith(constants.URL)) {
            urlBar.value = "";

            // sets focus for the wrong tab if on activate tab event thread
            urlBar.focus();
        }
    }
}

function __send(message, data, worker) {
    if (worker) {
        worker.port.emit(message, data);
    } else {
        workerRegistry.message(message, data);
    }
}

function __updateDial() {
    __updateDialFor();
}

function __updateDialFor(worker) {
    let bookmarkList = bookmarks.getBookmarks();

    // __updateDial will be called later through listener if bookmarks are not available yet
    if (bookmarkList) {
        __send("bookmarksUpdated", bookmarkList, worker);
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
        return self.data.load("./dial.css");
    }
}

function __updateStyle() {
    __updateStyleFor();
}

function __updateStyleFor(worker) {
    __send("styleUpdated", __getStyleString(), worker);
}

function __setupPageMod() {
    pageMod.PageMod({
        include: constants.URL,
        attachTo: ["existing", "top"],
        contentScriptOptions: { THUMBNAIL_WIDTH: constants.THUMBNAIL_WIDTH },
        contentScriptFile: [
            "./jquery-2.1.4.js",
            "./jquery-ui-1.11.4.js",
            "./dial.js",
            "./bookmark-data.js",
        ],
        onAttach: function(worker) {
            console.log("Attach");
            worker.on("detach", function() {
                console.log("Detach");
                workerRegistry.deregister(this);
            });

            worker.port.on("save", function(bookmark) {
                bookmarks.saveBookmark(bookmark);
            });

            workerRegistry.register(worker);
            __offThreadClearURLBar(worker.tab);
            worker.tab.on("activate", __offThreadClearURLBar);
            worker.tab.on("pageshow", __offThreadClearURLBar);
            worker.port.emit("init");
            __updateStyleFor(worker);
            __updateDialFor(worker);
        },
    });
}

function resetHomepage() {
    preferences.reset("browser.startup.homepage");
}

function maybeReplaceHomepage() {
    if (simplePreferences.prefs.replaceHomepage) {
        preferences.set("browser.startup.homepage", constants.URL);
    } else {
        resetHomepage();
    }
}

exports.main = function(options) {
    console.log("Starting up with reason ", options.loadReason);

    NewTabURL.override(constants.URL);

    uiContextMenu.init();

    simplePreferences.on("bookmarkFolderChooser", function() {
        uiPanels.openChooseFolderPanel(bookmarks.getTreeAsArray());
    });

    bookmarks.on("bookmarksUpdated", __updateDial);
    simplePreferences.on("bookmarkFolder",  __updateDial);

    simplePreferences.on("customStyleFile", __updateStyle);
    simplePreferences.on("useCustomStyleFile", __updateStyle);

    maybeReplaceHomepage();
    simplePreferences.on("replaceHomepage", function() { maybeReplaceHomepage(); });

    __setupPageMod();
};

exports.onUnload = function(reason) {
    console.log("Closing down with reason ", reason);

    bookmarks.shutdown();
    NewTabURL.reset();

    if (reason === "disable" || reason === "uninstall") {
        resetHomepage();
    }
};
