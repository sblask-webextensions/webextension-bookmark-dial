/* global Hermite_class */

const OPTION_BACKGROUND_COLOR = "option_background_color";
const OPTION_BACKGROUND_IMAGE_URL = "option_background_image_url";
const OPTION_BACKGROUND_SIZE = "option_background_size";
const OPTION_BOOKMARK_FOLDER = "option_bookmark_folder";
const OPTION_CUSTOM_CSS = "option_custom_css";

const THUMBNAIL_STORAGE_PREFIX = "thumbnail_";

const HERMITE = new Hermite_class(); // jscs:ignore

const SCROLLBAR_WIDTH = __getScrollbarWidth();

const THUMBNAIL_WIDTH = 300;
const THUMBNAIL_HEIGHT = 200;

const THUMBNAIL_STORAGE_MAXBYTES = 10 * 1024 * 1024;

class CleanURLSet extends Set {
    add(url) {
        return super.add(__cleanURL(url));
    }
    has(url) {
        return super.has(__cleanURL(url));
    }
    delete(url) {
        return super.delete(__cleanURL(url));
    }
}

let bookmarkFolder = undefined;
const bookmarkFolderRegistry = new CleanURLSet();

const thumbnailRegistry = new CleanURLSet();
__initThumbnailRegistry();

browser.storage.local.get([
    OPTION_BACKGROUND_COLOR,
    OPTION_BACKGROUND_IMAGE_URL,
    OPTION_BACKGROUND_SIZE,
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
            if (result[OPTION_BACKGROUND_SIZE] === undefined) {
                browser.storage.local.set({[OPTION_BACKGROUND_SIZE]: "auto"});
            }
            if (result[OPTION_CUSTOM_CSS] === undefined) {
                browser.storage.local.set({[OPTION_CUSTOM_CSS]: ""});
            }
            bookmarkFolder = result[OPTION_BOOKMARK_FOLDER];
            __initBookmarkFolderRegistry();
        }
    );

function onPreferencesChanged(changes) {
    if (changes[OPTION_BOOKMARK_FOLDER]) {
        bookmarkFolder = changes[OPTION_BOOKMARK_FOLDER].newValue;
        __initBookmarkFolderRegistry();
    }
}

function createThumbnail(bookmarkURL) {
    const collectData = Promise.all([
        browser.tabs.captureVisibleTab(),
        browser.tabs.executeScript({code: "window.innerWidth"}),
        browser.tabs.executeScript({code: "window.innerHeight"}),
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
    const [newWidth, newHeight] = __getNewSizing(originalWidth - SCROLLBAR_WIDTH, originalHeight);

    return new Promise(
        function(resolve, _reject) {
            const canvas = document.createElement("canvas");
            canvas.width = newWidth;
            canvas.height = newHeight;

            const image = new Image();
            image.onload = function() {
                canvas.getContext("2d").drawImage(image, 0, 0, newWidth, newHeight, 0, 0, newWidth, newHeight);
                return resolve(canvas);
            };
            image.src = dataURL;
        }
    );
}

function __getNewSizing(originalWidth, originalHeight) {
    const targetRatio = 3 / 2;
    const currentRatio = originalWidth / originalHeight;
    if (currentRatio > targetRatio) {
        // cut off width
        return [originalHeight * targetRatio, originalHeight];
    } else {
        // cut off height
        return [originalWidth, originalWidth / targetRatio];
    }
}

function __resize(canvas) {
    HERMITE.resample_single(canvas, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, true); // jscs:ignore
    return canvas;
}

function __simpleResize(canvas) { // eslint-disable-line no-unused-vars
    const resizeCanvas = document.createElement("canvas");
    resizeCanvas.width = THUMBNAIL_WIDTH;
    resizeCanvas.height = THUMBNAIL_HEIGHT;
    resizeCanvas.getContext("2d").drawImage(
        canvas,
        0, 0, canvas.width, canvas.height,
        0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT,
    );
    return resizeCanvas;
}

function __getThumbnailURLs() {
    return browser.storage.local.get().then(
        preferenceItems => {
            return Object.keys(preferenceItems)
                .filter(key => { return key.indexOf(THUMBNAIL_STORAGE_PREFIX) === 0; })
                .map(key => { return key.substring(THUMBNAIL_STORAGE_PREFIX.length); });
        }
    );
}

function __initThumbnailRegistry() {
    return __getThumbnailURLs().then(thumbnailURLs => thumbnailURLs.map(thumbnailRegistry.add.bind(thumbnailRegistry)));
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
        __getThumbnailURLs().then(
            thumbnailURLs => {
                for (const url of thumbnailURLs) {
                    if (!bookmarkFolderRegistry.has(url)) {
                        browser.storage.local.remove(THUMBNAIL_STORAGE_PREFIX + url);
                        thumbnailRegistry.delete(url);
                    }
                }
            }
        );
    }
}

function __initBookmarkFolderRegistry() {
    if (!bookmarkFolder) {
        return false;
    }
    bookmarkFolderRegistry.clear();
    browser.bookmarks.getChildren(bookmarkFolder).then(
        bookmarks => {
            bookmarks
                .filter(bookmark => Object.prototype.hasOwnProperty.call(bookmark, "url"))
                .filter(bookmark => bookmark.url) // filter out folders and separators
                .map(bookmark => bookmark.url)
                .map(url => bookmarkFolderRegistry.add(url));
        }
    );
}

function __updateBookmarkFolderRegistry(bookmark) {
    if (bookmark.parentId === bookmarkFolder) {
        bookmarkFolderRegistry.add(bookmark.url);
    } else {
        bookmarkFolderRegistry.delete(bookmark.url);
    }
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
    return bookmarkFolderRegistry.has(url);
}

function __isURLOpenInActiveTabAndComplete(url) {
    if (!url) {
        return false;
    }

    return chainPromises([
        ()     => browser.tabs.query({active: true, currentWindow: true}),
        (tabs) => tabs[0],
        (tab)  => tab.status === "complete" && __cleanURL(tab.url) === __cleanURL(url),
    ]);
}

function __cleanURL(url) {
    return url.replace(/https?:\/\//, "").replace(/\/+$/, "");
}

function handleBookmarkChange(bookmark) {
    if (!bookmark.url) {
        // folder or separator
        return;
    }
    __updateBookmarkFolderRegistry(bookmark);
    maybeCreateThumbnail(bookmark.url);
}

browser.bookmarks.onCreated.addListener(
    (_id, bookmark) => handleBookmarkChange(bookmark)
);
browser.bookmarks.onChanged.addListener(
    (id, _changeInfo) => browser.bookmarks.get(id).then(bookmarks => handleBookmarkChange(bookmarks[0]))
);
browser.bookmarks.onMoved.addListener(
    (id, _moveInfo) => browser.bookmarks.get(id).then(bookmarks => handleBookmarkChange(bookmarks[0]))
);
browser.bookmarks.onRemoved.addListener(
    (_id, removeInfo) => bookmarkFolderRegistry.delete(removeInfo.node.url)
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
            ()     => browser.tabs.query({active: true, currentWindow: true}),
            (tabs) => __isURLFromBookmarkFolder(tabs[0].url),
        ]);
    }
    if (request.message === "generateThumbnail") {
        chainPromises([
            ()     => browser.tabs.query({active: true, currentWindow: true}),
            (tabs) => tabs[0],
            (tab)  => __isURLFromBookmarkFolder(tab.url) ? createThumbnail(tab.url) : null,
        ]);
    }
}
browser.runtime.onMessage.addListener(handleRequest);

function chainPromises(functions) {
    let promise = Promise.resolve();
    for (const function_ of functions) {
        promise = promise.then(function_);
    }

    return promise.catch((error) => { console.warn(error); });
}

function __makeStyle() {
    const style = document.createElement("style");
    style.type = "text/css";
    document.head.appendChild(style);
    return style;
}

function __getScrollbarWidth() {
    const css = `
        .scrollbar-measure {
            height: 100px;
            overflow: scroll;
            position: absolute;
            top: -9999px;
            width: 100px;
        }
    `;

    const style = __makeStyle();
    style.appendChild(document.createTextNode(css));

    const div = document.createElement("div");
    div.className = "scrollbar-measure";
    document.body.appendChild(div);

    const scrollbarWidth = div.offsetWidth - div.clientWidth;

    document.body.removeChild(div);
    document.head.removeChild(style);
    return scrollbarWidth;
}

function handleInstalled(details) {
    if (details.reason === "update" && details.previousVersion === "1.1.2") {
        browser.tabs.create({
            url: "update.html",
        });
    }
}
browser.runtime.onInstalled.addListener(handleInstalled);
