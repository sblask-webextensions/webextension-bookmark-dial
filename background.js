import {Hermite_class} from "./hermite.js";

const OPTION_BACKGROUND_COLOR = "option_background_color";
const OPTION_BACKGROUND_IMAGE_URL = "option_background_image_url";
const OPTION_BACKGROUND_SIZE = "option_background_size";
const OPTION_BOOKMARK_FOLDER = "option_bookmark_folder";
const OPTION_CONFIRM_BOOKMARK_DELETION = "option_confirm_bookmark_deletion";
const OPTION_CUSTOM_CSS = "option_custom_css";

const THUMBNAIL_STORAGE_PREFIX = "thumbnail_";

const HERMITE = new Hermite_class();

const THUMBNAIL_WIDTH = 300;
const THUMBNAIL_HEIGHT = 200;

const THUMBNAIL_STORAGE_MAXBYTES = 10 * 1024 * 1024;

async function __initPreferences() {
    const result = await browser.storage.local.get([
        OPTION_BACKGROUND_COLOR,
        OPTION_BACKGROUND_IMAGE_URL,
        OPTION_BACKGROUND_SIZE,
        OPTION_CONFIRM_BOOKMARK_DELETION,
        OPTION_CUSTOM_CSS,
    ]);
    if (result[OPTION_BACKGROUND_COLOR] === undefined) {
        await browser.storage.local.set({[OPTION_BACKGROUND_COLOR]: "#000000"});
    }
    if (result[OPTION_BACKGROUND_IMAGE_URL] === undefined) {
        await browser.storage.local.set({[OPTION_BACKGROUND_IMAGE_URL]: ""});
    }
    if (result[OPTION_BACKGROUND_SIZE] === undefined) {
        await browser.storage.local.set({[OPTION_BACKGROUND_SIZE]: "auto"});
    }
    if (result[OPTION_CONFIRM_BOOKMARK_DELETION] === undefined) {
        await browser.storage.local.set({[OPTION_CONFIRM_BOOKMARK_DELETION]: false});
    }
    if (result[OPTION_CUSTOM_CSS] === undefined) {
        await browser.storage.local.set({[OPTION_CUSTOM_CSS]: ""});
    }
}
browser.runtime.onInstalled.addListener(__initPreferences);

async function createThumbnail(bookmarkURL) {
    const [tab] = await browser.tabs.query({active: true, currentWindow: true});
    let screenshotDataURL, measurements;
    try {
        [screenshotDataURL, [{result: measurements}]] = await Promise.all([
            browser.tabs.captureVisibleTab(tab.windowId),
            browser.scripting.executeScript({
                target: {tabId: tab.id},
                func: () => {
                    return {
                        clientWidth: document.documentElement.clientWidth,
                        clientHeight: document.documentElement.clientHeight,
                        innerWidth: window.innerWidth,
                        innerHeight: window.innerHeight,
                    };
                },
            }),
        ]);
    } catch (error) {
        console.warn("Unable to capture the active tab.", error);
        return;
    }
    const canvas = await __dataURLToCanvas(screenshotDataURL, measurements);
    __resize(canvas);
    const thumbnailDataURL = await __canvasToDataURL(canvas);
    await __storeThumbnail(bookmarkURL, thumbnailDataURL);
}

async function __dataURLToCanvas(dataURL, measurements) {
    const imageBlob = await fetch(dataURL).then((response) => response.blob());
    const image = await createImageBitmap(imageBlob);
    // Measured dimensions are CSS pixels, the captured image can be in device
    // pixels so there needs to be some conversion. innerWidth and innerHeight
    // includes scrollbars, just like the image, so use them to calculate the
    // ratio and multiply with clientWidth and clientHeight to get width and
    // height without scrollbar
    const pixelRatio = image.width / measurements.innerWidth;
    const [cropX, cropWidth, cropHeight] = __getNewSizing(
        measurements.clientWidth * pixelRatio,
        measurements.clientHeight * pixelRatio,
    );
    const canvas = new OffscreenCanvas(cropWidth, cropHeight);
    canvas.getContext("2d").drawImage(
        image,
        cropX,
        0,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight);
    return canvas;
}

async function __canvasToDataURL(canvas) {
    const blob = await canvas.convertToBlob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(reader.result));
        reader.addEventListener("error", () => reject(reader.error));
        reader.readAsDataURL(blob);
    });
}

function __getNewSizing(originalWidth, originalHeight) {
    const targetRatio = 3 / 2;
    const currentRatio = originalWidth / originalHeight;
    if (currentRatio > targetRatio) {
        // cut off width
        const newWidth = originalHeight * targetRatio;
        // center horizontally
        const cropX = Math.round((originalWidth - newWidth) / 2);
        return [cropX, newWidth, originalHeight];
    } else {
        // cut off height
        return [0, originalWidth, originalWidth / targetRatio];
    }
}

function __resize(canvas) {
    HERMITE.resample_single(canvas, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, true);
    return canvas;
}

async function __storeThumbnail(bookmarkURL, thumbnailDataURL) {
    await browser.storage.local.set({[THUMBNAIL_STORAGE_PREFIX + bookmarkURL]: thumbnailDataURL});
    await __maybeRemoveUnusedThumbnails();
}

async function __getThumbnailURLs() {
    const preferenceItems = await browser.storage.local.get();
    return new Set(
        Object.keys(preferenceItems)
            .filter((key) => { return key.startsWith(THUMBNAIL_STORAGE_PREFIX); })
            .map((key) => { return key.substring(THUMBNAIL_STORAGE_PREFIX.length); })
    );
}

async function __hasThumbnail(url) {
    const key = THUMBNAIL_STORAGE_PREFIX + url;
    const result = await browser.storage.local.get(key);
    return result[key] !== undefined;
}

async function __maybeRemoveUnusedThumbnails() {
    const bytesInUse = await browser.storage.local.getBytesInUse();
    if (bytesInUse > THUMBNAIL_STORAGE_MAXBYTES) {
        const cleanBookmarkURLSet = await __cleanBookmarkURLSet();
        const thumbnailURLs = await __getThumbnailURLs();
        for (const url of thumbnailURLs) {
            if (!cleanBookmarkURLSet.has(__cleanURL(url))) {
                await browser.storage.local.remove(THUMBNAIL_STORAGE_PREFIX + url);
            }
        }
    }
}

async function maybeCreateThumbnail(url) {
    const isURLOpenInActiveTabAndComplete = await __isURLOpenInActiveTabAndComplete(url);
    if (!isURLOpenInActiveTabAndComplete) {
        return;
    }
    const hasThumbnail = await __hasThumbnail(url);
    if (hasThumbnail) {
        return;
    }
    const cleanBookmarkURLSet = await __cleanBookmarkURLSet();
    if (!cleanBookmarkURLSet.has(__cleanURL(url))) {
        return;
    }
    await createThumbnail(url);
}

async function __cleanBookmarkURLSet() {
    const result = await browser.storage.local.get([OPTION_BOOKMARK_FOLDER]);
    const bookmarkFolder = result[OPTION_BOOKMARK_FOLDER];
    if (!bookmarkFolder) {
        return new Set();
    }
    const bookmarks = await browser.bookmarks.getChildren(bookmarkFolder);
    return new Set(
        bookmarks
            .map((bookmark) => bookmark.url)
            .filter(Boolean)
            .map(__cleanURL)
    );
}

async function __isURLOpenInActiveTabAndComplete(url) {
    if (!url) {
        return false;
    }

    const [tab] = await browser.tabs.query({active: true, currentWindow: true});
    return tab.status === "complete" && __cleanURL(tab.url) === __cleanURL(url);
}

function __cleanURL(url) {
    if (url) {
        return url.replace(/https?:\/\//, "").replace(/\/+$/, "");
    }
    return url;
}

async function handleBookmarkChange(bookmark) {
    if (!bookmark.url) {
        // folder or separator
        return;
    }
    await maybeCreateThumbnail(bookmark.url);
}

browser.bookmarks.onCreated.addListener(
    (_id, bookmark) => handleBookmarkChange(bookmark)
);
browser.bookmarks.onChanged.addListener(
    async (id, _changeInfo) => {
        const [bookmark] = await browser.bookmarks.get(id);
        await handleBookmarkChange(bookmark);
    }
);
browser.bookmarks.onMoved.addListener(
    async (id, _moveInfo) => {
        const [bookmark] = await browser.bookmarks.get(id);
        await handleBookmarkChange(bookmark);
    }
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
    async (activeInfo) => {
        const tab = await browser.tabs.get(activeInfo.tabId);
        // delay as Chrome fails to capture image otherwise
        await new Promise((resolve) => setTimeout(resolve, 100));
        await maybeCreateThumbnail(tab.url);
    }
);

async function handleRequest(request) {
    if (request.message === "isGenerateThumbnailEnabled") {
        const [tab] = await browser.tabs.query({active: true, currentWindow: true});
        return (await __cleanBookmarkURLSet()).has(__cleanURL(tab.url));
    }
    if (request.message === "generateThumbnail") {
        const [tab] = await browser.tabs.query({active: true, currentWindow: true});
        if ((await __cleanBookmarkURLSet()).has(__cleanURL(tab.url))) {
            await createThumbnail(tab.url);
        }
    }
}
browser.runtime.onMessage.addListener(handleRequest);
