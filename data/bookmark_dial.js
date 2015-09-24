/* globals self, window */
/* jshint jquery:true */

let bookmarkCount;

function __normalizeTileWidth(tileWidth) {
    if (tileWidth > self.options.THUMBNAIL_WIDTH) {
        return self.options.THUMBNAIL_WIDTH;
    } else {
        return tileWidth;
    }
}


function __getTileWidth(bookmarkCount, windowWidth, windowHeight) {
    let previousTileWidth = -1;
    let newTileWidth = 0;
    let tilesPerLine = 1;
    while (newTileWidth > previousTileWidth && tilesPerLine < 100) {
        previousTileWidth = newTileWidth;
        let lineCount = Math.ceil(bookmarkCount / tilesPerLine);
        newTileWidth = Math.floor(windowWidth / tilesPerLine);
        let tileHeight = newTileWidth / 3 * 2;
        if (tileHeight * lineCount > windowHeight) {
            tileHeight = windowHeight / lineCount;
            newTileWidth = tileHeight / 2 * 3;
        }
        tilesPerLine++;
    }
    return __normalizeTileWidth(previousTileWidth);
}


function __getTileSizeFromWidth(tileWidth, windowWidth, windowHeight) {
    let tileHeight = tileWidth / 3 * 2;
    let tileWidthPercentage = Math.floor(tileWidth / windowWidth * 100);
    let tileHeightPercentage = Math.floor(tileHeight / windowHeight * 100);
    return [tileHeight, tileWidthPercentage, tileHeightPercentage];
}


function __setSize(tileWidth, windowWidth, windowHeight) {
    let [tileHeight, tileWidthPercentage, tileHeightPercentage] =
        __getTileSizeFromWidth(tileWidth, windowWidth, windowHeight);
    console.log(
        "Setting size",
        tileWidth, tileHeight, tileWidthPercentage, tileHeightPercentage, windowWidth, windowHeight
    );
    let tilesPerLine = Math.floor(100 / tileWidthPercentage);
    let horizontalPaddingPercentage = (100 % tileWidthPercentage) / 2;
    let labelHeight = 5 + tileHeight / 20;
    let busyImage = tileWidth > 150 ? "busy.png" : "busy-small.png";
    let styleString = "" +
        "li {" +
            "max-width: " + self.options.THUMBNAIL_WIDTH + "px;" +
            "width: calc(100% / " + tilesPerLine + ");" +
        "}" +
        "ol {" +
            "padding: 2% calc(" + horizontalPaddingPercentage + "% + 2%);" +
        "}" +
        "div {" +
            "height: " + labelHeight * 2 + "px;" +
        "}" +
        "span {" +
            "font-size: " + labelHeight + "px;" +
        "}" +
        "a.busy {" +
            "background-image: url('" + busyImage + "');" +
        "}" +
    "";
    $("style#sizingStyle").text(styleString);
}

function updateStyle(styleString) {
    console.log("Update style");
    $("style#givenStyle").text(styleString);
}

function layout() {
    if (!bookmarkCount) {
        return;
    }
    console.log("Calculate layout");
    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;
    let tileWidth = __getTileWidth(bookmarkCount, windowWidth, windowHeight);
    __setSize(tileWidth, windowWidth, windowHeight);
}

let debounceTimeout;
function debouncedLayout() {
    if (debounceTimeout) {
        clearTimeout(debounceTimeout);
    }
    debounceTimeout = setTimeout(layout, 300);
}

function updateBookmarks(bookmarks) {
    console.log("Update " + bookmarks.length + " bookmarks");
    let updatedList = $('<ol class="flexbox">');
    for (let bookmark of bookmarks) {
        updatedList.append(
            $.parseHTML(
                '<li class="keepAspectRatio">' +
                    '<a href="' + bookmark.url + '">' +
                        '<img src="' + bookmark.thumbnail + '">' +
                        '<div class="absoluteBottom">' +
                            '<span class="absoluteBottom">' + bookmark.title + '</span>' +
                        '</div>' +
                    '</a>' +
                '</li>' +
                ''));
    }
    $("ol").replaceWith(updatedList);
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
    layout();
    window.onresize = debouncedLayout;
});

self.port.on("styleUpdated", function(styleString) {
    updateStyle(styleString);
});

self.port.on("bookmarksUpdated", function(bookmarks) {
    bookmarkCount = bookmarks.length;
    layout();
    updateBookmarks(bookmarks);
});

self.port.on("updatingThumbnail", function(bookmarkURL) {
    setBusy(bookmarkURL);
});

self.port.on("thumbnailsUpdated", function(thumbnails) {
    updateThumbnails(thumbnails);
});
