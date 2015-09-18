const core = require("sdk/view/core");
const tab_utils = require("sdk/tabs/utils");
const tabs = require("sdk/tabs");
const timers = require("sdk/timers");

const workerRegistry = require("./worker-registry");

const DEBUG = false;

const SECOND_THUMBNAIL_DELAY = 5000;
const THUMBNAIL_BACKGROUND = "rgba(0,0,0,0)";
const THUMBNAIL_WIDTH = 600;

function __hideTab(tab) {
    if (DEBUG) {
        return;
    }
    let lowLevelTab = core.viewFor(tab);
    lowLevelTab.collapsed = true;
    lowLevelTab.disabled = true;
}

function __closeTab(tab) {
    if (DEBUG) {
        return;
    }
    tab.unpin();
    tab.close();
}

function __setStyle(tab) {
    tab.attach({ contentScriptFile: "./thumbnail_tab_content_script.js" });
}

function __windowForTab(tab) {
    let lowLevelTab = core.viewFor(tab);
    let browser = tab_utils.getBrowserForTab(lowLevelTab);
    return browser.contentWindow;
}

function __propagateThumbnail(url, canvas) {
    let thumbnails = {};
    thumbnails[url] = canvas.toDataURL();
    workerRegistry.message("thumbnailsUpdated", thumbnails);
}

function __generateThumbnail(url, tab) {
    console.log("Generate thumbnail for " + url);
    let canvas = __captureWindow(__windowForTab(tab));
    __propagateThumbnail(url, canvas);
}

function __processTab(url) {
    return function(tab) {
        __generateThumbnail(url, tab);
        let generateSecondThumbnail = function() {
            __generateThumbnail(url, tab);
            __closeTab(tab);
        };
        let timeout = timers.setTimeout(
            generateSecondThumbnail,
            SECOND_THUMBNAIL_DELAY
        );
        tab.on("close", function() {timers.clearTimeout(timeout);});
    };
}

function __captureWindow(window) {
    let canvas = window.document.createElement('canvas');
    canvas.width = THUMBNAIL_WIDTH;
    canvas.height = THUMBNAIL_WIDTH / 3 * 2;

    let ctx = canvas.getContext("2d");
    ctx.drawWindow(
        window,
        0,
        0,
        canvas.width,
        canvas.height,
        THUMBNAIL_BACKGROUND
    );
    return canvas;
}

function thumbnailFromURL(url) {
    console.log("Make thumbnail", url);
    workerRegistry.message("updatingThumbnail", url);
    tabs.open({
        url: url,
        inBackground: true,
        isPinned: true,
        onOpen: __hideTab,
        onReady: __setStyle,
        onLoad: __processTab(url),
    });
}
exports.thumbnailFromURL = thumbnailFromURL;
