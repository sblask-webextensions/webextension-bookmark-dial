const simplePreferences = require("sdk/simple-prefs");
const panel = require("sdk/panel");

const bookmarks = require("./bookmarks");

function openEditBookmarkPanel(bookmark, bookmarkFolders) {
    let options = {
        bookmark: bookmark,
        bookmarkFolders: bookmarkFolders,
        chosenFolder: simplePreferences.prefs.bookmarkFolder,
        saveOnSelect: false,
    };
    let panelInstance = panel.Panel({
        contentURL: "./panel/edit_bookmark_panel.html",
        contentScriptOptions: options,
        height: 300,
        width: 400,
    });
    panelInstance.on("hide", panelInstance.destroy);
    panelInstance.port.on("save", function (data) {
        panelInstance.hide();
        bookmarks.saveBookmark(data);
    });
    panelInstance.show();
}
exports.openEditBookmarkPanel = openEditBookmarkPanel;

function openChooseFolderPanel(bookmarkFolders) {
    let options = {
        bookmarkFolders: bookmarkFolders,
        chosenFolder: simplePreferences.prefs.bookmarkFolder,
        saveOnSelect: true,
    };
    let panelInstance = panel.Panel({
        contentURL: "./panel/choose_folder_panel.html",
        contentScriptOptions: options,
        height: 220,
        width: 300,
    });
    panelInstance.on("hide", panelInstance.destroy);
    panelInstance.port.on("save", function (value) {
        panelInstance.hide();
        simplePreferences.prefs.bookmarkFolder = value;
    });
    panelInstance.show();
}
exports.openChooseFolderPanel = openChooseFolderPanel;
