/* globals _, self, window */
/* jshint jquery:true */
const maxTileWidth = 600;

let bookmarkCount;

function __normalizeTileWidth(tileWidth) {
    if (tileWidth > maxTileWidth) {
        return maxTileWidth;
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
    let styleString = "" +
        "li {" +
            // "width: calc(100% / " + tilesPerLine + ");" +
            "width: " + tileWidthPercentage + "%;" +
        "}" +
        "ol {" +
            // "padding: " + verticalPadding + "px " + horizontalPaddingPercentage + "% 0;" +
        "}" +
    "";
    $("style#sizingStyle").text(styleString);
}

function setStyle(styleString) {
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

function update(bookmarks) {
    console.log("Update " + bookmarks.length + " bookmarks");
    let updatedList = $("<ol>");
    for (let bookmark of bookmarks) {
        updatedList.append(
            $.parseHTML(
                '<li class="keepAspectRatio">' +
                    '<a href="' + bookmark.url + '">' +
                        '<img src="./foo.jpg">' +
                        '<span>' + bookmark.title + '</span>' +
                    '</a>' +
                '</li>' +
                ''));
    }
    $("ol").replaceWith(updatedList);
}

self.port.on("init", function() {
    layout();
    window.onresize = _.debounce(layout, 300);
});

self.port.on("styleUpdate", function(styleString) {
    setStyle(styleString);
});

self.port.on("update", function(bookmarks) {
    bookmarkCount = bookmarks.length;
    layout();
    update(bookmarks);
});
