const OPTION_BACKGROUND_COLOR = "option_background_color";
const OPTION_BACKGROUND_IMAGE_URL = "option_background_image_url";
const OPTION_BACKGROUND_SIZE = "option_background_size";
const OPTION_BOOKMARK_FOLDER = "option_bookmark_folder";
const OPTION_COLUMN_COUNT = "option_column_count";
const OPTION_CUSTOM_CSS = "option_custom_css";

const FOLDER_SELECT = document.querySelector("#folderSelect");

function restoreOptions() {
    browser.storage.local.get([
        OPTION_BACKGROUND_COLOR,
        OPTION_BACKGROUND_IMAGE_URL,
        OPTION_BACKGROUND_SIZE,
        OPTION_COLUMN_COUNT,
        OPTION_CUSTOM_CSS,
    ]).then(
        result => {
            setTextValue("backgroundColor", result[OPTION_BACKGROUND_COLOR]);
            document.getElementById("backgroundColorPicker").style.backgroundColor = result[OPTION_BACKGROUND_COLOR];

            setTextValue("backgroundImageURL", result[OPTION_BACKGROUND_IMAGE_URL]);

            //setBooleanValue("backgroundSize" + result[OPTION_BACKGROUND_SIZE].charAt(0).toUpperCase() + result[OPTION_BACKGROUND_SIZE].slice(1), true);

            const numberOfColumnsIndex = result[OPTION_COLUMN_COUNT] || 0;
            document.getElementById("columnCount").options[numberOfColumnsIndex].setAttribute("selected", true);

            setTextValue("customCSS", result[OPTION_CUSTOM_CSS]);

            let oldSelect = document.getElementById("actionURL");
            let selectedOption = oldSelect.options[oldSelect.selectedIndex]?.value;

            let newSelect = document.createElement("SELECT");
            newSelect.id = "actionURL";

            var currentUrlOption = document.createElement("option");
            currentUrlOption.text = "Current URL";
            currentUrlOption.value = "-1";
            currentUrlOption.selected = true;
            newSelect.add(currentUrlOption);

            browser.runtime.sendMessage({ message: "getBookmarkURL" }).then(
                bookmarks => bookmarks.forEach(bookmark => {
                    var option = document.createElement("option");
                    let shortValue = bookmark.substring(0, 75);
                    option.text = shortValue < bookmark ? shortValue+' ...' : shortValue;
                    option.value = bookmark;
                    if(selectedOption === bookmark){
                        option.selected = true;
                    }
                    newSelect.add(option);
                })
            );

            newSelect.addEventListener( "change", enableGenerateThumbnailButton );

            oldSelect.parentElement.replaceChild(newSelect, oldSelect);
        }
    );
}

function enableAutosave() {
    for (const input of document.querySelectorAll("input:not([type=checkbox]):not([type=file]):not([type=radio]), textarea")) {
        input.addEventListener("input", saveOptions);
    }
    for (const input of document.querySelectorAll("input[type=radio], input[type=checkbox], select")) {
        input.addEventListener("change", saveOptions);
    }
}

function setTextValue(elementID, newValue) {
    const oldValue = document.getElementById(elementID).value;

    if (oldValue !== newValue) {
        document.getElementById(elementID).value = newValue;
    }
}

function setBooleanValue(elementID, newValue) {
    document.getElementById(elementID).checked = newValue;
}

function saveOptions(event) {
    if (event) {
        event.preventDefault();
    }

    const folderSelect = document.getElementById("folderSelect");
    let selectedFolder = undefined;
    if (folderSelect.selectedIndex >= 0) {
        selectedFolder = folderSelect.options[folderSelect.selectedIndex].value;
        enableGenerateThumbnailButton();
    }

    browser.storage.local.set({
        [OPTION_BACKGROUND_COLOR]: document.getElementById("backgroundColor").value,
        [OPTION_BACKGROUND_IMAGE_URL]: document.getElementById("backgroundImageURL").value,
        [OPTION_BACKGROUND_SIZE]: document.querySelector("#backgroundSizeAuto").checked && "auto"
                                  ||
                                  document.querySelector("#backgroundSizeContain").checked && "contain"
                                  ||
                                  document.querySelector("#backgroundSizeCover").checked && "cover",
        [OPTION_BOOKMARK_FOLDER]: selectedFolder,
        [OPTION_COLUMN_COUNT]: document.getElementById("columnCount").selectedIndex || null,
        [OPTION_CUSTOM_CSS]: document.getElementById("customCSS").value,
    });
}

function loadBookmarkTree(folders, level=-1) {
    for (const folder of folders) {
        const {id, title, children} = folder;

        if (!children) {
            continue;
        }

        if (level >= 0 && title) {
            const option = document.createElement("option");
            option.setAttribute("id", id);
            option.setAttribute("value", id);
            option.text = title;
            option.style.marginLeft = `${level}em`;
            FOLDER_SELECT.appendChild(option);
        }

        loadBookmarkTree(children, level + 1);
    }
}

function maybeSelectFolder() {
    browser.storage.local.get([
        OPTION_BOOKMARK_FOLDER,
    ]).then(
        result => {
            const bookmarkFolder = result[OPTION_BOOKMARK_FOLDER];
            if (!bookmarkFolder) {
                return;
            }
            for (const option of document.getElementById("folderSelect").options) {
                if (option.value === bookmarkFolder) {
                    option.setAttribute("selected", true);
                    enableGenerateThumbnailButton();
                }
            }
        }
    );
}

function loadBackgroundImageURL(event) {
    const reader = new FileReader();
    reader.addEventListener(
        "load",
        () => {
            setTextValue("backgroundImageURL", reader.result);
            saveOptions();
        },
    );

    const input = event.target;
    reader.readAsDataURL(input.files[0]);
}

function enableGenerateThumbnailButton() {
    browser.runtime.sendMessage({ message: "isGenerateThumbnailEnabled", url: document.getElementById("actionURL").value }).then(
        enabled => {
            document.querySelector("#generateThumbnailButton").disabled = !enabled;
            document.querySelector("#loadThumbnailButton").disabled = !enabled;
        }
    );
}

function loadThumbnailImage(){
    let file = document.getElementById("thumbnailFile")['files'][0];

    var reader = new FileReader();
    reader.onload = function () {
        browser.runtime.sendMessage({ message: "loadThumbnail", image: reader.result, url: document.getElementById("actionURL").value });
    }
    reader.readAsDataURL(file);
}

function exportSettings(){
    browser.runtime.sendMessage({ message: "getExportJSON"}).then(
        exportData => {
            var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData));
            var a = document.createElement('a');
            a.href = 'data:' + data;
            a.download = 'BookmarkDial_export.json';
            a.click();
        }
    );
}

function importSettings(){
    let file = document.getElementById("importFile")['files'][0];

    var reader = new FileReader();
    reader.onload = function () {
        browser.runtime.sendMessage({ message: "importJSON", data: JSON.parse(reader.result)});
    }
    reader.readAsText(file);
}


document.addEventListener("DOMContentLoaded", restoreOptions);
document.addEventListener("DOMContentLoaded", enableAutosave);

Array.from(document.getElementsByClassName("optionLink")).forEach(e => {
    e.addEventListener('click', () => {browser.runtime.openOptionsPage(); window.close();});
});

document.querySelector("form").addEventListener(
    "submit",
    saveOptions,
);
document.querySelector("#backgroundImageChooser").addEventListener(
    "change",
    loadBackgroundImageURL,
);
document.querySelector("#generateThumbnailButton").addEventListener(
    "click",
    () => browser.runtime.sendMessage({ message: "generateThumbnail", url: document.getElementById("actionURL").value }),
);
document.querySelector("#loadThumbnailButton").addEventListener(
    "click",
    () => document.getElementById("thumbnailFile").click()
);
document.querySelector("#thumbnailFile").addEventListener(
    "change",
    loadThumbnailImage
);

document.querySelector("#importButton").addEventListener(
    "click",
    () => document.getElementById("importFile").click()
);
document.querySelector("#exportButton").addEventListener(
    "click",
    exportSettings,
);
document.querySelector("#importFile").addEventListener(
    "change",
    importSettings
);

browser.storage.onChanged.addListener(restoreOptions);

browser.bookmarks.getTree().then(
    (folders) => {
        loadBookmarkTree(folders);
        maybeSelectFolder();
    }
);
