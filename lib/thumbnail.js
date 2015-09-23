const core = require("sdk/view/core");
const tab_utils = require("sdk/tabs/utils");
const tabs = require("sdk/tabs");
const timers = require("sdk/timers");

const constants = require("./constants");
const thumbnailStorage = require("./thumbnail-storage");
const workerRegistry = require("./worker-registry");

let processingQueue = new Set();
let isProcessing = false;

function __initTab(tab) {
    __hideTab(tab);
    __setupTimeout(tab);
}

function __hideTab(tab) {
    if (constants.DEBUG_DO_NOT_HIDE_TAB) {
        return;
    }
    let lowLevelTab = core.viewFor(tab);
    lowLevelTab.collapsed = true;
    lowLevelTab.disabled = true;
}

function __setupTimeout(tab) {
    let timeout = timers.setTimeout(
        function() { __closeTab(tab); },
        constants.THUMBNAIL_TIMEOUT
    );
    tab.on("close", function() {
        timers.clearTimeout(timeout);
    });

}

function __closeTab(tab) {
    if (constants.DEBUG_DO_NOT_CLOSE_TAB) {
        return;
    }
    tab.unpin();
    tab.close();
}

function __prepareTab(tab) {
    tab.attach({
        contentScriptFile: "./thumbnail_tab_content_script.js",
        contentScriptOptions: { THUMBNAIL_WIDTH: constants.THUMBNAIL_WIDTH },
    });
    __browserForTab(tab).mute();
}

function __browserForTab(tab) {
    let lowLevelTab = core.viewFor(tab);
    return tab_utils.getBrowserForTab(lowLevelTab);
}

function __windowForTab(tab) {
    return __browserForTab(tab).contentWindow;
}

function __propagateThumbnail(url, canvas) {
    let imageDataURL = canvas.toDataURL();

    thumbnailStorage.setThumbnail(url, imageDataURL);

    let thumbnails = {};
    thumbnails[url] = imageDataURL;
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
        let generateSecondThumbnailAndClose = function() {
            __generateThumbnail(url, tab);
            __closeTab(tab);
        };
        let timeout = timers.setTimeout(
            generateSecondThumbnailAndClose,
            constants.SECOND_THUMBNAIL_DELAY
        );
        tab.on("close", function() {
            timers.clearTimeout(timeout);
        });
    };
}

function __captureWindow(window) {
    let canvas = window.document.createElement('canvas');
    canvas.width = constants.THUMBNAIL_WIDTH;
    canvas.height = constants.THUMBNAIL_WIDTH / 3 * 2;

    let ctx = canvas.getContext("2d");
    ctx.drawWindow(
        window,
        0,
        0,
        canvas.width,
        canvas.height,
        constants.THUMBNAIL_BACKGROUND
    );
    return canvas;
}

function __processOne() {
    let url = processingQueue.values().next().value;
    if (!url) {
        isProcessing = false;
        return;
    }
    isProcessing = true;
    processingQueue.delete(url);
    console.log("Make thumbnail", url);
    workerRegistry.message("updatingThumbnail", url);
    tabs.open({
        url: url,
        inBackground: true,
        isPinned: true,
        onOpen: __initTab,
        onReady: __prepareTab,
        onLoad: __processTab(url),
        onClose: __processOne,
    });
}

function updateThumbnails(urls) {
    console.log("Adding urls to thumbnail queue", urls, isProcessing);
    for (let url of urls) {
        processingQueue.add(url);
    }
    if (!isProcessing) {
        __processOne();
    }
}
exports.updateThumbnails = updateThumbnails;
