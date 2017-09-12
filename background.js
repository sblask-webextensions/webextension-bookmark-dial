const OPTION_BACKGROUND_COLOR = "option_background_color";
const OPTION_BACKGROUND_IMAGE_URL = "option_background_image_url";

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
    Promise.all([
        browser.tabs.captureVisibleTab(),
        browser.tabs.executeScript({ code: "window.innerWidth" }),
        browser.tabs.executeScript({ code: "window.innerHeight" }),
        browser.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs[0].url),
    ])
        .then(result => { return dataURLToCanvas(...flatten(result), bookmarkURL); })
        .then(canvas => { console.log(canvas.toDataURL()); });
}

function flatten(list) {
    return [].concat.apply([], list);
}

function dataURLToCanvas(dataURL, originalWidth, originalHeight, currentTabURL, bookmarkURL) {
    if (currentTabURL !== bookmarkURL) {
        return null;
    }

    let [newWidth, newHeight] = getNewSizing(originalWidth, originalHeight);

    return new Promise(
        function(resolve, _reject) {
            let canvas = document.createElement("canvas");
            canvas.width = newWidth;
            canvas.height = newHeight;

            let context = canvas.getContext("2d");

            let image = new Image();
            image.onload = function() {
                context.drawImage(image, 0, 0, newWidth, newHeight, 0, 0, newWidth, newHeight);
                return resolve(canvas);
            };
            image.src = dataURL;
        }
    );
}

function getNewSizing(originalWidth, originalHeight) {
    if (originalWidth / originalHeight > 1.5) {
        return [originalWidth / 3 * 2, originalHeight];
    } else {
        return [originalWidth, originalHeight / 3 * 2];
    }
}

browser.bookmarks.onCreated.addListener((_id, bookmark) => createThumbnail(bookmark.url));
browser.bookmarks.onChanged.addListener((_id, changeInfo) => createThumbnail(changeInfo.url));

function handleInstalled(details) {
    if (details.reason === "update" && details.previousVersion === "1.1.2") {
        browser.tabs.create({
            url: "update.html",
        });
    }
}
browser.runtime.onInstalled.addListener(handleInstalled);
