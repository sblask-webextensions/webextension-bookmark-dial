const core = require("sdk/view/core");
const tabs = require("sdk/tabs");
const tabUtils = require("sdk/tabs/utils");
const preferences = require("sdk/preferences/service");
const timers = require("sdk/timers");

const constants = require("./constants");
const thumbnailStorage = require("./thumbnail-storage");
const workerRegistry = require("./worker-registry");

let processingQueue = new Set();
let isProcessing = false;
let thumbnailTab;

function __initTab(tab) {
    thumbnailTab = tab;
    __hideTab(tab);
    __muteTab(tab);
    __setupTimeout(tab);
    __setupShutdownOnLastTabClose();
    __setupShutdownOnWindowClose(tab);
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

function shutDownOnLastTabClose() {
    const closeWithLastTab = preferences.get("browser.tabs.closeWindowWithLastTab");
    if (closeWithLastTab && tabs.length == 1) {
        console.log("Closed last tab, stop thumbnail generation now");
        // stopGeneration blocks current thread for some reason,
        // so move it away from it using setTimeout
        timers.setTimeout(stopGeneration, 50);
    }
}

function __setupShutdownOnLastTabClose() {
    tabs.on("close", shutDownOnLastTabClose);
}

function __setupShutdownOnWindowClose(tab) {
    let window = tabUtils.getOwnerWindow(core.viewFor(tab));
    let closeTabFunction = function() {
        console.log("Close window");
        stopGeneration();
    };

    window.addEventListener("close", closeTabFunction);

    tab.on("close", function() {
        console.log("Close thumbnail generating tab");
        window.removeEventListener("close", closeTabFunction);
    });
}

function __closeTab(tab) {
    if (constants.DEBUG_DO_NOT_CLOSE_TAB) {
        return;
    }

    tabs.removeListener("close", shutDownOnLastTabClose);

    thumbnailTab = undefined;
    tab.unpin();
    tab.close();
}

function __applyThumbnailStyleToTab(tab) {
    tab.attach({
        contentScriptFile: "./thumbnail_tab_content_script.js",
        contentScriptOptions: { THUMBNAIL_WIDTH: constants.THUMBNAIL_WIDTH },
    });
}

function __muteTab(tab) {
    let browser = __browserForTab(tab);
    if (browser.mute) {
        browser.mute();
    }
}

function __browserForTab(tab) {
    let lowLevelTab = core.viewFor(tab);
    return tabUtils.getBrowserForTab(lowLevelTab);
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
        __applyThumbnailStyleToTab(tab);
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
    let canvas = window.document.createElement("canvas");
    canvas.width = constants.THUMBNAIL_WIDTH;
    canvas.height = constants.THUMBNAIL_WIDTH / 3 * 2;

    let ctx = canvas.getContext("2d");
    ctx.drawWindow(
        window,
        0,
        1,
        canvas.width,
        canvas.height,
        constants.THUMBNAIL_BACKGROUND
    );
    return canvas;
}

function __processOne() {
    let url = processingQueue.values().next().value;
    let noActiveDial = !workerRegistry.getAvailableWorker();

    // without this, a new tab might be opened after closing the last window
    let noWindowAvailable = !tabs.activeTab;
    if (!url || noActiveDial || noWindowAvailable) {
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

function stopGeneration() {
    processingQueue = new Set();
    if (thumbnailTab) {
        __closeTab(thumbnailTab);
    }
}

exports.stopGeneration = stopGeneration;
