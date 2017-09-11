const OPTION_BACKGROUND_COLOR = "option_background_color";
const OPTION_BACKGROUND_IMAGE_URL = "option_background_image_url";
const OPTION_BOOKMARK_FOLDER = "option_bookmark_folder";

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

        // helper's size is off for some reason when not setting this explicitely
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
let bookmarkFolder = undefined;

let bookmarks = undefined;
let columnCount = undefined;

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
    let lineCount = Math.ceil(bookmarkCount / columnCount);
    let tileWidth = Math.min(
        THUMBNAIL_WIDTH,
        Math.floor(containerWidth / columnCount)
    );
    let tileHeight = tileWidth / 3 * 2;
    return [columnCount, lineCount, tileWidth, tileHeight];
}

function __setStyle(layout, windowWidth, windowHeight) {
    console.log("Setting size", layout, windowWidth, windowHeight);
    let [tilesPerLine, lineCount, tileWidth, tileHeight] = layout;
    let listWidth = tileWidth * tilesPerLine;
    let listHeight = tileHeight * lineCount;

    let horizontalPadding = Math.ceil((windowWidth - listWidth) / 2);
    let verticalPadding = Math.floor((windowHeight - listHeight) / 2);

    let labelHeight = 5 + tileHeight / 20;
    let styleString = `
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

    console.log("Calculate layout with columnCount " + columnCount);
    let containerWidth = window.innerWidth - LIST_MARGIN;
    let containerHeight = window.innerHeight - LIST_MARGIN;

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
            background-size: contain;
        }
    `;
}

function __createElement(tagName, attributes, children) {
    const element = document.createElement(tagName);
    for (let key of Object.keys(attributes)) { // TODO replace with Map
        element.setAttribute(key, attributes[key]);
    }

    for (let child of children) {
        element.appendChild(child);
    }

    return element;
}

function __makeHTMLListItem(bookmark) {
    return __createElement("li", {class: "keepAspectRatio"}, [
        __createElement("a", {id: bookmark.id, href: bookmark.url, title: bookmark.title}, [
            __createElement("img", {src: bookmark.thumbnail || ""}, []),
            __createElement("div", {class: "absoluteBottom"}, [
                __createElement("span", {class: "absoluteBottom"}, [
                    document.createTextNode(bookmark.title),
                ]),
            ]),
        ]),
    ]);
}

function __makeBookmarkListSortable() {
    $("ol").sortable(SORTABLE_OPTIONS);
    $("ol").disableSelection();
}

function __replaceBookmarkList() {
    let oldList = document.querySelector("ol");
    let newList = __createElement("ol", {}, bookmarks.map(__makeHTMLListItem));
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
    if (changes[OPTION_BOOKMARK_FOLDER]) {
        bookmarkFolder = changes[OPTION_BOOKMARK_FOLDER].newValue;
        __updateDial();
    }
    $("style#backgroundStyle").text(__getBackgroundStyleString());
}

function initFromPreferences() {
    browser.storage.local.get([
        OPTION_BACKGROUND_COLOR,
        OPTION_BACKGROUND_IMAGE_URL,
        OPTION_BOOKMARK_FOLDER,
    ]).then(
        (result) => {
            backgroundColor = result[OPTION_BACKGROUND_COLOR];
            backgroundImageURL = result[OPTION_BACKGROUND_IMAGE_URL];
            bookmarkFolder = result[OPTION_BOOKMARK_FOLDER];
            __updateDial();

            $("style#backgroundStyle").text(__getBackgroundStyleString());
        }
    );
}

browser.storage.onChanged.addListener(onPreferencesChanged);

browser.bookmarks.onCreated.addListener(__updateDial);
browser.bookmarks.onChanged.addListener(__updateDial);
browser.bookmarks.onMoved.addListener(__updateDial);
browser.bookmarks.onRemoved.addListener(__updateDial);

window.addEventListener("resize", debouncedMakeLayout, true);

initFromPreferences();
