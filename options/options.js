const OPTION_BACKGROUND_COLOR = "option_background_color";
const OPTION_BACKGROUND_IMAGE_URL = "option_background_image_url";
const OPTION_BOOKMARK_FOLDER = "option_bookmark_folder";

const FOLDER_SELECT = document.querySelector("#folderSelect");

function restoreOptions() {
    browser.storage.local.get([
        OPTION_BACKGROUND_COLOR,
        OPTION_BACKGROUND_IMAGE_URL,
    ]).then(
        result => {
            setTextValue("backgroundColor", result[OPTION_BACKGROUND_COLOR]);
            document.getElementById("backgroundColorPicker").style.backgroundColor = result[OPTION_BACKGROUND_COLOR];

            setTextValue("backgroundImageURL", result[OPTION_BACKGROUND_IMAGE_URL]);
        }
    );
}

function enableAutosave() {
    for (let input of document.querySelectorAll("input:not([type=checkbox]):not([type=file]):not([type=radio]), textarea")) {
        input.addEventListener("input", saveOptions);
    }
    for (let input of document.querySelectorAll("input[type=radio], input[type=checkbox], select")) {
        input.addEventListener("change", saveOptions);
    }
}

function setTextValue(elementID, newValue) {
    let oldValue = document.getElementById(elementID).value;

    if (oldValue !== newValue) {
        document.getElementById(elementID).value = newValue;
    }
}

function saveOptions(event) {
    if (event) {
        event.preventDefault();
    }

    let folderSelect = document.getElementById("folderSelect");
    let selectedFolder = undefined;
    if (folderSelect.selectedIndex >= 0) {
        selectedFolder = folderSelect.options[folderSelect.selectedIndex].value;
    }

    browser.storage.local.set({
        [OPTION_BACKGROUND_COLOR]: document.getElementById("backgroundColor").value,
        [OPTION_BACKGROUND_IMAGE_URL]: document.getElementById("backgroundImageURL").value,
        [OPTION_BOOKMARK_FOLDER]: selectedFolder,
    });
}

function loadBookmarkTree(folders, level=-1) {
    for (let folder of folders) {
        let {id, title, children} = folder;

        if (!children) {
            continue;
        }

        if (level >= 0 && title) {
            let option = document.createElement("option");
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
            let bookmarkFolder = result[OPTION_BOOKMARK_FOLDER];
            if (!bookmarkFolder) {
                return;
            }
            for (let option of document.getElementById("folderSelect").options) {
                if (option.value === bookmarkFolder) {
                    option.setAttribute("selected", true);
                }
            }
        }
    );
}

function loadBackgroundImageURL(event) {
    let reader = new FileReader();
    reader.addEventListener(
        "load",
        () => {
            setTextValue("backgroundImageURL", reader.result);
            saveOptions();
        },
    );

    let input = event.target;
    reader.readAsDataURL(input.files[0]);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.addEventListener("DOMContentLoaded", enableAutosave);
document.querySelector("form").addEventListener("submit", saveOptions);

document.querySelector("#backgroundImageChooser").addEventListener("change", loadBackgroundImageURL);

browser.storage.onChanged.addListener(restoreOptions);

browser.bookmarks.getTree().then(
    (folders) => {
        loadBookmarkTree(folders);
        maybeSelectFolder();
    }
);
