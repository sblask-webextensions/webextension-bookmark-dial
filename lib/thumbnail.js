const core = require("sdk/view/core");
const tab_utils = require("sdk/tabs/utils");
const tabs = require("sdk/tabs");

const workerRegistry = require("./worker-registry");

const THUMBNAIL_BACKGROUND = "rgba(0,0,0,0)";
const THUMBNAIL_WIDTH = 600;

function __hideTab(tab) {
    let lowLevelTab = core.viewFor(tab);
    lowLevelTab.collapsed = true;
    lowLevelTab.disabled = true;
}

function __setStyle(tab) {
    tab.attach({ contentScriptFile: "./thumbnail_tab_content_script.js" });
}

function __windowForTab(tab) {
    let lowLevelTab = core.viewFor(tab);
    let browser = tab_utils.getBrowserForTab(lowLevelTab);
    return browser.contentWindow;
}

function __processTab(url) {
    return function(tab) {
        let canvas = __captureWindow(__windowForTab(tab));
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
