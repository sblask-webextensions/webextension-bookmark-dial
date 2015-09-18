const bookmarks = require("sdk/places/bookmarks");
const self = require("sdk/self");

exports.URL = self.data.url("bookmark_dial.html");

exports.DEBUG = true;

exports.SECOND_THUMBNAIL_DELAY = 5000;
exports.THUMBNAIL_BACKGROUND = "rgba(0,0,0,0)";
exports.THUMBNAIL_WIDTH = 300;

exports.DEFAULT_BOOKMARK_FOLDERS = [
    bookmarks.TOOLBAR,
    bookmarks.MENU,
    bookmarks.UNSORTED,
];

exports.FOLDER_QUERYS = [
    {group: bookmarks.TOOLBAR},
    {group: bookmarks.MENU},
    {group: bookmarks.UNSORTED},
];

const ICON_PATH = "jar:file:///usr/lib/firefox/browser/omni.ja!/chrome/browser/skin/classic/browser/places/";

exports.DEFAULT_FOLDER_DATA = {
    TOOLBAR: {
        label: "Bookmarks Toolbar",
        image: ICON_PATH + "bookmarksToolbar.png",
    },
    MENU: {
        label: "Bookmarks Menu",
        image: ICON_PATH + "bookmarksMenu.png",
    },
    UNSORTED: {
        label: "Unsorted Bookmarks",
        image: ICON_PATH + "unsortedBookmarks.png",
    },
};
