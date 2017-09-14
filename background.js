/* global Hermite_class */

const OPTION_BACKGROUND_COLOR = "option_background_color";
const OPTION_BACKGROUND_IMAGE_URL = "option_background_image_url";
const OPTION_BOOKMARK_FOLDER = "option_bookmark_folder";
const OPTION_CUSTOM_CSS = "option_custom_css";

const THUMBNAIL_STORAGE_PREFIX = "thumbnail_";

const HERMITE = new Hermite_class(); // jscs:ignore

const SCROLLBAR_WIDTH = __getScrollbarWidth();

const THUMBNAIL_WIDTH = 300;
const THUMBNAIL_HEIGHT = 200;

const THUMBNAIL_STORAGE_MAXBYTES = 10 * 1024 * 1024;

let bookmarkFolder = undefined;

let thumbnailRegistry = new Set();

browser.storage.local.get([
    OPTION_BACKGROUND_COLOR,
    OPTION_BACKGROUND_IMAGE_URL,
    OPTION_BOOKMARK_FOLDER,
    OPTION_CUSTOM_CSS,
])
    .then(
        (result) => {
            if (result[OPTION_BACKGROUND_COLOR] === undefined) {
                browser.storage.local.set({[OPTION_BACKGROUND_COLOR]: "#000000"});
            }
            if (result[OPTION_BACKGROUND_IMAGE_URL] === undefined) {
                browser.storage.local.set({[OPTION_BACKGROUND_IMAGE_URL]: ""});
            }
            if (result[OPTION_CUSTOM_CSS] === undefined) {
                browser.storage.local.set({[OPTION_CUSTOM_CSS]: ""});
            }
            bookmarkFolder = result[OPTION_BOOKMARK_FOLDER];
        }
    );

function onPreferencesChanged(changes) {
    if (changes[OPTION_BOOKMARK_FOLDER]) {
        bookmarkFolder = changes[OPTION_BOOKMARK_FOLDER].newValue;
    }
}

function createThumbnail(bookmarkURL) {
    let collectData = Promise.all([
        browser.tabs.captureVisibleTab(),
        browser.tabs.executeScript({ code: "window.innerWidth" }),
        browser.tabs.executeScript({ code: "window.innerHeight" }),
    ]);
    chainPromises([
        ()       => { return collectData; },
        (result) => { return __dataURLToCanvas(...__flatten(result)); },
        (canvas) => { return __resize(canvas); },
        (canvas) => { return __storeThumbnail(bookmarkURL, canvas.toDataURL()); },
    ]);

}

function __flatten(list) {
    return [].concat.apply([], list);
}

function __dataURLToCanvas(dataURL, originalWidth, originalHeight) {
    let [newWidth, newHeight] = __getNewSizing(originalWidth - SCROLLBAR_WIDTH, originalHeight);

    return new Promise(
        function(resolve, _reject) {
            let canvas = document.createElement("canvas");
            canvas.width = newWidth;
            canvas.height = newHeight;

            let image = new Image();
            image.onload = function() {
                canvas.getContext("2d").drawImage(image, 0, 0, newWidth, newHeight, 0, 0, newWidth, newHeight);
                return resolve(canvas);
            };
            image.src = dataURL;
        }
    );
}

function __getNewSizing(originalWidth, originalHeight) {
    if (originalWidth / originalHeight > 1.5) {
        return [originalHeight / 3 * 2, originalHeight];
    } else {
        return [originalWidth, originalWidth / 3 * 2];
    }
}

function __resize(canvas) {
    HERMITE.resample_single(canvas, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, true); // jscs:ignore
    return canvas;
}

function __simpleResize(canvas) { // eslint-disable-line no-unused-vars
    let resizeCanvas = document.createElement("canvas");
    resizeCanvas.width = THUMBNAIL_WIDTH;
    resizeCanvas.height = THUMBNAIL_HEIGHT;
    resizeCanvas.getContext("2d").drawImage(
        canvas,
        0, 0, canvas.width, canvas.height,
        0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT,
    );
    return resizeCanvas;
}

function __storeThumbnail(bookmarkURL, thumbnailDataURL) {
    chainPromises([
        ()           => { return browser.storage.local.set({[THUMBNAIL_STORAGE_PREFIX + bookmarkURL]: thumbnailDataURL}); },
        ()           => { return thumbnailRegistry.add(bookmarkURL); },
        ()           => { return browser.storage.local.getBytesInUse(); },
        (bytesInUse) => { return __maybeRemoveUnusedThumbnails(bytesInUse); },
    ]);
}

function __maybeRemoveUnusedThumbnails(bytesInUse) {
    if (bytesInUse > THUMBNAIL_STORAGE_MAXBYTES) {
        Promise.all([
            browser.storage.local.get().then(__getThumbnailURLs),
            browser.bookmarks.getChildren(bookmarkFolder).then(__getBookmarkURLSet),
        ]).then(
            result => {
                let [thumbnailURLs, bookmarkURLSet] = result;
                for (let url of thumbnailURLs) {
                    if (!bookmarkURLSet.has(url)) {
                        browser.storage.local.remove(THUMBNAIL_STORAGE_PREFIX + url);
                        thumbnailRegistry.delete(url);
                    }
                }
            }
        );
    }
}

function __getThumbnailURLs(preferenceItems) {
    return Object.keys(preferenceItems)
        .filter(key => { return key.indexOf(THUMBNAIL_STORAGE_PREFIX) === 0; })
        .map(key => { return key.substring(THUMBNAIL_STORAGE_PREFIX.length); });
}

function __getBookmarkURLSet(bookmarks) {
    let bookmarkURLs = bookmarks
        .filter(bookmark => bookmark.hasOwnProperty("url"))
        .map(bookmark => bookmark.url);
    return new Set(bookmarkURLs);
}

function maybeCreateThumbnail(url) {
    Promise.all([
        __hasNoThumbnail(url),
        __isURLFromBookmarkFolder(url),
        __isURLOpenInActiveTabAndComplete(url),
    ]).then(
        conditions => {
            if (conditions.every(Boolean)) {
                createThumbnail(url);
            }
        }
    );
}

function __hasNoThumbnail(url) {
    return !thumbnailRegistry.has(url);
}

function __isURLFromBookmarkFolder(url) {
    if (!bookmarkFolder) {
        return false;
    }
    return browser.bookmarks.getChildren(bookmarkFolder).then(
        children => {
            for (let child of children) {
                if (__cleanURL(child.url) === __cleanURL(url)) {
                    return true;
                }
            }
            return false;
        }
    );
}

function __isURLOpenInActiveTabAndComplete(url) {
    if (!url) {
        return false;
    }

    return chainPromises([
        ()     => browser.tabs.query({ active: true, currentWindow: true }),
        (tabs) => tabs[0],
        (tab)  => __cleanURL(tab.url) === __cleanURL(url) && tab.status === "complete",
    ]);
}

function __cleanURL(url) {
    return url.replace(/https?:\/\//, "").replace(/\/+$/, "");
}

browser.bookmarks.onCreated.addListener(
    (_id, bookmark) => maybeCreateThumbnail(bookmark.url)
);
browser.bookmarks.onChanged.addListener(
    (id, _changeInfo) => browser.bookmarks.get(id).then(bookmarks => maybeCreateThumbnail(bookmarks[0].url))
);
browser.bookmarks.onMoved.addListener(
    (id, _moveInfo) => browser.bookmarks.get(id).then(bookmarks => maybeCreateThumbnail(bookmarks[0].url))
);

browser.tabs.onUpdated.addListener(
    (_tabId, _changeInfo, tabInfo) => {
        if (tabInfo.status !== "complete") {
            return;
        }
        return maybeCreateThumbnail(tabInfo.url);
    }
);
browser.tabs.onActivated.addListener(
    (activeInfo) => {
        return chainPromises([
            ()    => browser.tabs.get(activeInfo.tabId),
            // delay as Chrome fails to capture image otherwise
            (tab) => setTimeout(() => maybeCreateThumbnail(tab.url), 100),
        ]);
    }
);

browser.storage.onChanged.addListener(onPreferencesChanged);

function handleRequest(request) {
    if (request.message === "isGenerateThumbnailEnabled") {
        return chainPromises([
            ()     => browser.tabs.query({ active: true, currentWindow: true }),
            (tabs) => __isURLFromBookmarkFolder(tabs[0].url),
        ]);
    }
    if (request.message === "generateThumbnail") {
        chainPromises([
            ()     => browser.tabs.query({ active: true, currentWindow: true }),
            (tabs) => tabs[0],
            (tab)  => __isURLFromBookmarkFolder(tab.url).then(isIt => isIt ? createThumbnail(tab.url) : null),
        ]);
    }
}
browser.runtime.onMessage.addListener(handleRequest);

function chainPromises(functions) {
    let promise = Promise.resolve();
    for (let function_ of functions) {
        promise = promise.then(function_);
    }

    return promise.catch((error) => { console.warn(error); });
}

function __makeStyle() {
    let style = document.createElement("style");
    style.type = "text/css";
    document.head.appendChild(style);
    return style;
}

function __getScrollbarWidth() {
    let css = `
        .scrollbar-measure {
            height: 100px;
            overflow: scroll;
            position: absolute;
            top: -9999px;
            width: 100px;
        }
    `;

    let style = __makeStyle();
    style.appendChild(document.createTextNode(css));

    let div = document.createElement("div");
    div.className = "scrollbar-measure";
    document.body.appendChild(div);

    let scrollbarWidth = div.offsetWidth - div.clientWidth;

    document.body.removeChild(div);
    document.head.removeChild(style);
    return scrollbarWidth;
}

function initThumbnailRegistry() {
    return browser.storage.local.get().then(
        items => {
            for (let key of Object.keys(items)) {
                if (key.indexOf(THUMBNAIL_STORAGE_PREFIX) === 0) {
                    let url = key.substring(THUMBNAIL_STORAGE_PREFIX.length);
                    thumbnailRegistry.add(url);
                }
            }
        }
    );
}
initThumbnailRegistry();

function handleInstalled(details) {
    if (details.reason === "update" && details.previousVersion === "1.1.2") {
        browser.tabs.create({
            url: "update.html",
        });
    }
}
browser.runtime.onInstalled.addListener(handleInstalled);
