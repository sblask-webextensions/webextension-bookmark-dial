const OPTION_BACKGROUND_COLOR = "option_background_color";
const OPTION_BACKGROUND_IMAGE_URL = "option_background_image_url";
const OPTION_BACKGROUND_SIZE = "option_background_size";
const OPTION_BOOKMARK_FOLDER = "option_bookmark_folder";
const OPTION_COLUMN_COUNT = "option_column_count";
const OPTION_CUSTOM_CSS = "option_custom_css";

const THUMBNAIL_STORAGE_PREFIX = "thumbnail_";

const LIST_MARGIN = 20;
const THUMBNAIL_WIDTH = 300;

const SORTABLE_OPTIONS = {
    containment: "window",
    cursor: "move",
    distance: 5,
    helper: "clone",
    revert: true,
    scroll: false,
    tolerance: "pointer",
    start: function(_event, ui) {
        const tileRect = ui.placeholder[0].getBoundingClientRect();

        // helper's size is off for some reason when not setting this explicitly
        ui.helper.height(tileRect.height);
        ui.helper.width(tileRect.width);
    },

    update: function(_event, ui) {
        browser.bookmarks.move(
            ui.item.find("a")[0].id,
            {
                index: ui.item.index("li"),
            },
        );
    },
};

let backgroundColor = undefined;
let backgroundImageURL = undefined;
let backgroundSize = undefined;

let bookmarkFolder = undefined;

let bookmarks = undefined;
let columnCount = undefined;

const thumbnails = new Map();

function __getOptimalColumnCountLayout(bookmarkCount, containerWidth, containerHeight) {
    let newLineCount = 0;
    let newTileHeight = 0;
    let newTileWidth = 0;
    let newTilesPerLine = 0;

    let previousLineCount = 0;
    let previousTileHeight = 0;
    let previousTileWidth = 0;
    let previousTilesPerLine = 0;

    while (newTileWidth >= previousTileWidth && newTileWidth <= THUMBNAIL_WIDTH) {
        previousLineCount = newLineCount;
        previousTileHeight = newTileHeight;
        previousTileWidth = newTileWidth;
        previousTilesPerLine = newTilesPerLine;

        newTilesPerLine++;
        newLineCount = Math.ceil(bookmarkCount / newTilesPerLine);
        newTileWidth = Math.min(
            THUMBNAIL_WIDTH,
            Math.floor(containerWidth / newTilesPerLine)
        );
        newTileHeight = Math.floor(newTileWidth / 3 * 2);
        if (newTileHeight * newLineCount > containerHeight) {
            newTileHeight = Math.min(
                Math.floor(containerHeight / newLineCount),
                THUMBNAIL_WIDTH / 3 * 2
            );
            newTileWidth = Math.floor(newTileHeight / 2 * 3);
        }
    }

    return [previousTilesPerLine, previousLineCount, previousTileWidth, previousTileHeight];
}

function __getFixedColumnCountLayout(columnCount, bookmarkCount, containerWidth) {
    const lineCount = Math.ceil(bookmarkCount / columnCount);
    const tileWidth = Math.min(
        THUMBNAIL_WIDTH,
        Math.floor(containerWidth / columnCount)
    );
    const tileHeight = tileWidth / 3 * 2;
    return [columnCount, lineCount, tileWidth, tileHeight];
}

function __setStyle(layout, windowWidth, windowHeight) {
    const [tilesPerLine, lineCount, tileWidth, tileHeight] = layout;
    const listWidth = tileWidth * tilesPerLine;
    const listHeight = tileHeight * lineCount;

    const horizontalPadding = Math.ceil((windowWidth - listWidth) / 2);
    const verticalPadding = Math.floor((windowHeight - listHeight) / 2);

    const labelHeight = 5 + tileHeight / 20;
    const styleString = `
        li {
            max-width: ${ THUMBNAIL_WIDTH }px;
            width: calc(100% / ${ tilesPerLine });
        }
        ol {
            width: calc(100% - ${ LIST_MARGIN }px);
            height: calc(100% - ${ LIST_MARGIN }px);
            margin: ${ LIST_MARGIN / 2 }px;
            padding-top: ${ verticalPadding }px;
            padding-left: ${ horizontalPadding }px;
            padding-right: ${ horizontalPadding }px;
        }
        div {
            height: ${ labelHeight * 2 }px;
            line-height: ${ labelHeight * 2 }px;
        }
        span {
            font-size: ${ labelHeight }px;
        }
    `;
    $("style#sizingStyle").text(styleString);
}

function __makeLayout() {
    if (!bookmarks) {
        return;
    }

    const containerWidth = window.innerWidth - LIST_MARGIN;
    const containerHeight = window.innerHeight - LIST_MARGIN;

    let layout;
    if (columnCount) {
        layout = __getFixedColumnCountLayout(columnCount, bookmarks.length, containerWidth);
    } else {
        layout = __getOptimalColumnCountLayout(bookmarks.length, containerWidth, containerHeight);
    }

    __setStyle(layout, containerWidth, containerHeight);
}

function __getBackgroundStyleString() {
    return `
        body {
            background-attachment: fixed;
            background-color: ${backgroundColor};
            background-image: url(${backgroundImageURL});
            background-position: center;
            background-repeat: no-repeat;
            background-size: ${backgroundSize};
        }
    `;
}

function __createElement(tagName, attributes, children) {
    const element = document.createElement(tagName);
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
    }

    for (const child of children) {
        element.appendChild(child);
    }

    return element;
}

function __makeHTMLListItem(bookmark) {
    return __createElement("li", {class: "keepAspectRatio"}, [
        __createElement("a", {id: bookmark.id, href: bookmark.url, title: bookmark.title}, [
            __createElement("img", {src: bookmark.thumbnail || thumbnails.get(__cleanURL(bookmark.url)) || ""}, []),
            __createElement("div", {class: "absoluteBottom"}, [
                __createElement("div", {class: "absoluteBottomBlur"}, []),
                __createElement("div", {class: "absoluteBottom"}, [
                    document.createTextNode(bookmark.title),
                ]),
            ]),
        ]),
        __createElement("span", { class: "delete", title: "Delete Bookmark"}, [
            document.createTextNode("✗"),
        ]),
    ]);
}

function __makeBookmarkListSortable() {
    $("ol").sortable(SORTABLE_OPTIONS);
    $("ol").disableSelection();
}

function __makeDeleteLinksClickable() {
    $(".delete").on("click", function(event) {
        browser.bookmarks.remove($(event.target).parent().children("a").attr("id"));
    });
}

function __replaceBookmarkList() {
    const oldList = document.querySelector("ol");
    const newList = __createElement("ol", {}, bookmarks.map(__makeHTMLListItem));
    oldList.parentNode.replaceChild(newList, oldList);
}

function __updateDial() {
    if (!bookmarkFolder) {
        return;
    }

    browser.bookmarks.getChildren(bookmarkFolder).then(
        (bookmarkOrFolder) => {
            bookmarks = bookmarkOrFolder.filter(item => item.url && item.url.indexOf("place:") !== 0);
            __replaceBookmarkList();
            __makeBookmarkListSortable();
            __makeDeleteLinksClickable();
            __makeLayout();
        }
    );
}

let debounceTimeout;
function debouncedMakeLayout() {
    if (debounceTimeout) {
        clearTimeout(debounceTimeout);
    }

    debounceTimeout = setTimeout(__makeLayout, 300);
}

function onPreferencesChanged(changes) {
    if (changes[OPTION_BACKGROUND_COLOR]) {
        backgroundColor = changes[OPTION_BACKGROUND_COLOR].newValue;
    }
    if (changes[OPTION_BACKGROUND_IMAGE_URL]) {
        backgroundImageURL = changes[OPTION_BACKGROUND_IMAGE_URL].newValue;
    }
    if (changes[OPTION_BACKGROUND_SIZE]) {
        backgroundSize = changes[OPTION_BACKGROUND_SIZE].newValue;
    }
    if (changes[OPTION_BOOKMARK_FOLDER]) {
        bookmarkFolder = changes[OPTION_BOOKMARK_FOLDER].newValue;
        __updateDial();
    }
    if (changes[OPTION_COLUMN_COUNT]) {
        columnCount = changes[OPTION_COLUMN_COUNT].newValue;
        debouncedMakeLayout();
    }
    if (changes[OPTION_CUSTOM_CSS]) {
        $("style#givenStyle").text(changes[OPTION_CUSTOM_CSS].newValue);
    }

    $("style#backgroundStyle").text(__getBackgroundStyleString());
}

function initFromPreferences() {
    browser.storage.local.get([
        OPTION_BACKGROUND_COLOR,
        OPTION_BACKGROUND_IMAGE_URL,
        OPTION_BACKGROUND_SIZE,
        OPTION_BOOKMARK_FOLDER,
        OPTION_COLUMN_COUNT,
        OPTION_CUSTOM_CSS,
    ]).then(
        (result) => {
            backgroundColor = result[OPTION_BACKGROUND_COLOR];
            backgroundImageURL = result[OPTION_BACKGROUND_IMAGE_URL];
            backgroundSize = result[OPTION_BACKGROUND_SIZE];
            bookmarkFolder = result[OPTION_BOOKMARK_FOLDER];
            columnCount = result[OPTION_COLUMN_COUNT];
            __updateDial();

            $("style#givenStyle").text(result[OPTION_CUSTOM_CSS]);
            $("style#backgroundStyle").text(__getBackgroundStyleString());
        }
    );
}

function onThumbnailsChanged(changes) {
    for (const [key, changeInfo] of Object.entries(changes)) {
        if (key.indexOf(THUMBNAIL_STORAGE_PREFIX) === 0 && changeInfo.newValue) {
            const url = key.substring(THUMBNAIL_STORAGE_PREFIX.length);
            const image = document.querySelector(`a[href*="${__cleanURL(url)}"] img`);

            if (image) {
                image.src = changeInfo.newValue;
            }

            thumbnails.set(__cleanURL(url), changeInfo.newValue);
        }
    }
}

function initThumbnails() {
    return browser.storage.local.get().then(
        items => {
            for (const [key, value] of Object.entries(items)) {
                if (key.indexOf(THUMBNAIL_STORAGE_PREFIX) === 0) {
                    const url = key.substring(THUMBNAIL_STORAGE_PREFIX.length);
                    thumbnails.set(__cleanURL(url), value);
                }
            }
        }
    );
}

function __cleanURL(url) {
    return url.replace(/https?:\/\//, "").replace(/\/+$/, "");
}

browser.storage.onChanged.addListener(onPreferencesChanged);
browser.storage.onChanged.addListener(onThumbnailsChanged);

browser.bookmarks.onCreated.addListener(__updateDial);
browser.bookmarks.onChanged.addListener(__updateDial);
browser.bookmarks.onMoved.addListener(__updateDial);
browser.bookmarks.onRemoved.addListener(__updateDial);

window.addEventListener("resize", debouncedMakeLayout, true);

initThumbnails().then(initFromPreferences);
