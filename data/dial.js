/* global getBookmarkDataForNode */
/* eslint-env jquery */

let originalIndex;

const LIST_MARGIN = 20;
const SORTABLE_OPTIONS = {
    containment: "window",
    cursor: "move",
    distance: 5,
    helper: "clone",
    revert: true,
    scroll: false,
    tolerance: "pointer",
    start: function(_event, ui) {
        originalIndex = ui.placeholder.index("li") - 1;
        const tileRect = ui.placeholder[0].getBoundingClientRect();

        // helper's size is off for some reason when not setting this explicitely
        ui.helper.height(tileRect.height);
        ui.helper.width(tileRect.width);
    },

    update: function(_event, ui) {
        const bookmark = getBookmarkDataForNode(ui.item.find("a")[0]);
        if (originalIndex < bookmark.index) {
            bookmark.index = bookmark.index + 1;
        }

        self.port.emit("save", bookmark);
    },
};

let bookmarkCount;

function __getOptimalTileLayout(bookmarkCount, containerWidth, containerHeight) {
    let newLineCount = 0;
    let newTileHeight = 0;
    let newTileWidth = 0;
    let newTilesPerLine = 0;

    let previousLineCount = 0;
    let previousTileHeight = 0;
    let previousTileWidth = 0;
    let previousTilesPerLine = 0;

    while (newTileWidth >= previousTileWidth && newTileWidth <= self.options.THUMBNAIL_WIDTH) {
        previousLineCount = newLineCount;
        previousTileHeight = newTileHeight;
        previousTileWidth = newTileWidth;
        previousTilesPerLine = newTilesPerLine;

        newTilesPerLine++;
        newLineCount = Math.ceil(bookmarkCount / newTilesPerLine);
        newTileWidth = Math.min(
            self.options.THUMBNAIL_WIDTH,
            Math.floor(containerWidth / newTilesPerLine)
        );
        newTileHeight = Math.floor(newTileWidth / 3 * 2);
        if (newTileHeight * newLineCount > containerHeight) {
            newTileHeight = Math.min(
                Math.floor(containerHeight / newLineCount),
                self.options.THUMBNAIL_WIDTH / 3 * 2
            );
            newTileWidth = Math.floor(newTileHeight / 2 * 3);
        }
    }

    return [previousTilesPerLine, previousLineCount, previousTileWidth, previousTileHeight];
}

function __setStyle(layout, windowWidth, windowHeight) {
    console.log("Setting size", layout, windowWidth, windowHeight);
    let [tilesPerLine, lineCount, tileWidth, tileHeight] = layout;
    let listWidth = tileWidth * tilesPerLine;
    let listHeight = tileHeight * lineCount;

    let horizontalPadding = Math.ceil((windowWidth - listWidth) / 2);
    let verticalPadding = Math.floor((windowHeight - listHeight) / 2);

    let labelHeight = 5 + tileHeight / 20;
    let busyImage = tileWidth > 150 ? "busy.png" : "busy-small.png";
    let styleString = `
        li {
            max-width: ${ self.options.THUMBNAIL_WIDTH }px;
            width: calc(100% / ${ tilesPerLine });
        }
        ol {
            width: calc(100% - ${ LIST_MARGIN }px);
            height: calc(100% - ${ LIST_MARGIN }px);
            margin: ${ LIST_MARGIN / 2 }px;
            padding: ${ verticalPadding }px ${ horizontalPadding }px 0;
        }
        div {
            height: ${ labelHeight * 2 }px;
        }
        span {
            font-size: ${ labelHeight }px;
        }
        a.busy {
            background-image: url("${ busyImage }");
        }
    `;
    $("style#sizingStyle").text(styleString);
}

function updateBackgroundStyle(styleString) {
    console.log("Update background style");
    $("style#backgroundStyle").text(styleString);
}

function updateGivenStyle(styleString) {
    console.log("Update Given style");
    $("style#givenStyle").text(styleString);
}

function makeLayout() {
    if (!bookmarkCount) {
        return;
    }

    console.log("Calculate layout");
    let containerWidth = window.innerWidth - LIST_MARGIN;
    let containerHeight = window.innerHeight - LIST_MARGIN;
    let layout = __getOptimalTileLayout(bookmarkCount, containerWidth, containerHeight);
    __setStyle(layout, containerWidth, containerHeight);
}

let debounceTimeout;
function debouncedLayout() {
    if (debounceTimeout) {
        clearTimeout(debounceTimeout);
    }

    debounceTimeout = setTimeout(makeLayout, 300);
}

function __createElement(tagName, attributes, children) {
    const element = document.createElement(tagName);
    for (let key in attributes) {
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
            __createElement("img", {src: bookmark.thumbnail}, []),
            __createElement("div", {class: "absoluteBottom"}, [
                __createElement("span", {class: "absoluteBottom"}, [
                    document.createTextNode(bookmark.title),
                ]),
                __createElement("span", {class: "absoluteBottom tags"}, [
                    document.createTextNode(bookmark.tags.join(", ")),
                ]),
            ]),
        ]),
    ]);
}

function __makeSortable() {
    $("ol").sortable(SORTABLE_OPTIONS);
    $("ol").disableSelection();
}

function updateBookmarks(bookmarks) {
    console.log("Update " + bookmarks.length + " bookmarks");
    const oldList = document.querySelector("ol");
    const newList = __createElement("ol", {}, bookmarks.map(__makeHTMLListItem));
    oldList.parentNode.replaceChild(newList, oldList);
    __makeSortable();
}

function __applyOnMatches(someFunction, urlMap) {
    $("a").each(function(index) {
        let anchor = $(this);
        let bookmarkURL = anchor.attr("href");
        if (urlMap[bookmarkURL]) {
            console.log("Found match at index " + index);
            someFunction(anchor, bookmarkURL, urlMap);
        }
    });
}

function __setBusy(anchor) {
    anchor.addClass("busy");
}

function setBusy(bookmarkURL) {
    let urlMap = {};
    urlMap[bookmarkURL] = true;
    __applyOnMatches(__setBusy, urlMap);
}

function __updateThumbnail(anchor, bookmarkURL, thumbnails) {
    console.log("Update thumbnail for " + bookmarkURL);
    let thumbnailURL = thumbnails[bookmarkURL];
    anchor.children("img").attr("src", thumbnailURL);
    anchor.removeClass("busy");
}

function updateThumbnails(thumbnails) {
    __applyOnMatches(__updateThumbnail, thumbnails);
}

self.port.on("init", function() {
    makeLayout();
    window.addEventListener("resize", debouncedLayout, true);
    __makeSortable();
});

self.port.on("backgroundUpdated", function(backgroundStyleString) {
    updateBackgroundStyle(backgroundStyleString);
});

self.port.on("styleUpdated", function(styleString) {
    updateGivenStyle(styleString);
});

self.port.on("bookmarksUpdated", function(bookmarks) {
    bookmarkCount = bookmarks.length;
    makeLayout();
    updateBookmarks(bookmarks);
});

self.port.on("updatingThumbnail", function(bookmarkURL) {
    setBusy(bookmarkURL);
});

self.port.on("thumbnailsUpdated", function(thumbnails) {
    updateThumbnails(thumbnails);
});
