const panel = require("sdk/panel");
const simplePreferences = require("sdk/simple-prefs");

function openChooseFolderPanel(bookmarkFolders) {
    let options = {
        bookmarkFolders: bookmarkFolders,
        chosenFolder: simplePreferences.prefs.bookmarkFolder,
        saveOnSelect: true,
    };
    let panelInstance = panel.Panel({
        contentURL: "./choose_folder_panel.html",
        contentScriptFile: "./folder-chooser.js",
        contentScriptOptions: options,
        contentStyleFile: "./folder-chooser.css",
        height: 200,
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
