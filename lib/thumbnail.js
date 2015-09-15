const core = require("sdk/view/core");
const tab_utils = require("sdk/tabs/utils");
const tabs = require("sdk/tabs");

const workerRegistry = require("./worker-registry");

const THUMBNAIL_BACKGROUND = "rgba(0,0,0,0)";
const WINDOW_WIDTH = 1024;
const THUMBNAIL_WIDTH = 600;

const STYLE_SCRIPT =
    "document.body.style.margin = '0';" +
    "document.body.style.width = '" + WINDOW_WIDTH + "px';" +
    "document.body.style.transform = 'scale(" + THUMBNAIL_WIDTH / WINDOW_WIDTH + ")';" +
    "document.body.style.transformOrigin = '0 0 0';" +
    "";

function __hideTab(tab) {
    let lowLevelTab = core.viewFor(tab);
    lowLevelTab.collapsed = true;
    lowLevelTab.disabled = true;
}

function __setStyle(tab) {
    tab.attach({ contentScript: STYLE_SCRIPT });
}

function __processTab(url) {
    return function(tab) {
        let lowLevelTab = core.viewFor(tab);
        let browser = tab_utils.getBrowserForTab(lowLevelTab);
        let canvas = __captureWindow(browser.contentWindow);
        let thumbnails = {};
        thumbnails[url] = canvas.toDataURL();
        workerRegistry.message("thumbnailsUpdated", thumbnails);
        tab.unpin();
        tab.close();
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
