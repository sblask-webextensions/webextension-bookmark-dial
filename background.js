/* global Hermite_class */

const OPTION_BACKGROUND_COLOR = "option_background_color";
const OPTION_BACKGROUND_IMAGE_URL = "option_background_image_url";

const THUMBNAIL_STORAGE_PREFIX = "thumbnail_";

const HERMITE = new Hermite_class(); // jscs:ignore

const SCROLLBAR_WIDTH = __getScrollbarWidth();

const THUMBNAIL_WIDTH = 300;
const THUMBNAIL_HEIGHT = 200;

const THUMBNAIL_STORAGE_MAXBYTES = 10 * 1024 * 1024;

let thumbnailRegistry = new Set();

browser.storage.local.get([
    OPTION_BACKGROUND_COLOR,
    OPTION_BACKGROUND_IMAGE_URL,
])
    .then(
        (result) => {
            if (result[OPTION_BACKGROUND_COLOR] === undefined) {
                browser.storage.local.set({[OPTION_BACKGROUND_COLOR]: "#000000"});
            }
            if (result[OPTION_BACKGROUND_IMAGE_URL] === undefined) {
                browser.storage.local.set({[OPTION_BACKGROUND_IMAGE_URL]: ""});
            }
        }
    );

function createThumbnail(bookmarkURL) {
    let collectData = Promise.all([
        browser.tabs.captureVisibleTab(),
        browser.tabs.executeScript({ code: "window.innerWidth" }),
        browser.tabs.executeScript({ code: "window.innerHeight" }),
        browser.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs[0].url),
    ]);
    chainPromises([
        ()       => { return collectData; },
        (result) => { return __dataURLToCanvas(...__flatten(result), bookmarkURL); },
        (canvas) => { return __resize(canvas); },
        (canvas) => { return __storeThumbnail(bookmarkURL, canvas.toDataURL()); },
    ]);

}

function __flatten(list) {
    return [].concat.apply([], list);
}

function __dataURLToCanvas(dataURL, originalWidth, originalHeight, currentTabURL, bookmarkURL) {
    if (currentTabURL !== bookmarkURL) {
        return null;
    }

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
        return [originalWidth / 3 * 2, originalHeight];
    } else {
        return [originalWidth, originalHeight / 3 * 2];
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
        browser.storage.local.get().then(
            items => {
                for (let key of Object.keys(items)) {
                    if (key.indexOf(THUMBNAIL_STORAGE_PREFIX) === 0) {
                        browser.storage.local.remove(key);

                        let url = key.substring(THUMBNAIL_STORAGE_PREFIX.length);
                        thumbnailRegistry.delete(url);
                    }
                }
            }
        );
    }
}

function maybeCreateThumbnail(url) {
    if (thumbnailRegistry.has(url)) {
        return;
    }
    createThumbnail(url);
}

browser.bookmarks.onCreated.addListener((_id, bookmark) => maybeCreateThumbnail(bookmark.url));
browser.bookmarks.onChanged.addListener((_id, changeInfo) => maybeCreateThumbnail(changeInfo.url));

function chainPromises(functions) {
    let promise = Promise.resolve();
    for (let function_ of functions) {
        promise = promise.then(function_);
    }

    return promise.catch((error) => { console.warn(error.message); });
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
