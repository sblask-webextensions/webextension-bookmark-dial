const OPTION_BACKGROUND_COLOR = "option_background_color";
const OPTION_BACKGROUND_IMAGE_URL = "option_background_image_url";
const OPTION_BACKGROUND_SIZE = "option_background_size";
const OPTION_BOOKMARK_FOLDER = "option_bookmark_folder";
const OPTION_COLUMN_COUNT = "option_column_count";
const OPTION_CONFIRM_BOOKMARK_DELETION = "option_confirm_bookmark_deletion";
const OPTION_CUSTOM_CSS = "option_custom_css";

const FOLDER_SELECT = document.querySelector("#folderSelect");

const tabIdParameter = new URL(location.href).searchParams.get("tabId");
const thumbnailTargetTabId = tabIdParameter === null ? undefined : Number(tabIdParameter);
const isStandalonePopup = tabIdParameter !== null;

let nativePickerOpen = false;

function restoreOptions() {
    browser.storage.local.get([
        OPTION_BACKGROUND_COLOR,
        OPTION_BACKGROUND_IMAGE_URL,
        OPTION_BACKGROUND_SIZE,
        OPTION_COLUMN_COUNT,
        OPTION_CONFIRM_BOOKMARK_DELETION,
        OPTION_CUSTOM_CSS,
    ]).then(
        (result) => {
            setTextValue("backgroundColor", result[OPTION_BACKGROUND_COLOR]);

            setTextValue("backgroundImageURL", result[OPTION_BACKGROUND_IMAGE_URL]);

            setRadioValue("backgroundSize", result[OPTION_BACKGROUND_SIZE]);

            const numberOfColumnsIndex = result[OPTION_COLUMN_COUNT] || 0;
            document.getElementById("columnCount").options[numberOfColumnsIndex].setAttribute("selected", true);

            setBooleanValue("confirmBookmarkDeletion", result[OPTION_CONFIRM_BOOKMARK_DELETION] === true);
            setTextValue("customCSS", result[OPTION_CUSTOM_CSS]);
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

function setRadioValue(name, newValue) {
    for (const input of document.getElementsByName(name)) {
        input.checked = input.value === newValue;
    }
}

async function saveOptions(event) {
    if (event) {
        event.preventDefault();
    }

    const folderSelect = document.getElementById("folderSelect");
    let selectedFolder = undefined;
    if (folderSelect.selectedIndex >= 0) {
        selectedFolder = folderSelect.options[folderSelect.selectedIndex].value;
    }

    await browser.storage.local.set({
        [OPTION_BACKGROUND_COLOR]: document.getElementById("backgroundColor").value,
        [OPTION_BACKGROUND_IMAGE_URL]: document.getElementById("backgroundImageURL").value,
        [OPTION_BACKGROUND_SIZE]: document.querySelector(`[name="backgroundSize"]:checked`)?.value,
        [OPTION_BOOKMARK_FOLDER]: selectedFolder,
        [OPTION_COLUMN_COUNT]: document.getElementById("columnCount").selectedIndex || null,
        [OPTION_CONFIRM_BOOKMARK_DELETION]: document.getElementById("confirmBookmarkDeletion").checked,
        [OPTION_CUSTOM_CSS]: document.getElementById("customCSS").value,
    });

    if (selectedFolder !== undefined) {
        await maybeEnableThumbnailButtons();
    }
}

function loadBookmarkTree(folders, level = -1) {
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
        (result) => {
            const bookmarkFolder = result[OPTION_BOOKMARK_FOLDER];
            if (!bookmarkFolder) {
                return;
            }
            for (const option of document.getElementById("folderSelect").options) {
                if (option.value === bookmarkFolder) {
                    option.setAttribute("selected", true);
                    maybeEnableThumbnailButtons();
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

function maybeEnableThumbnailButtons() {
    return browser.runtime.sendMessage({
        message: "isGenerateThumbnailEnabled",
        tabId: thumbnailTargetTabId,
    }).then(
        (enabled) => {
            document.querySelector("#generateThumbnailButton").disabled = !enabled;
            document.querySelector("#loadThumbnailButton").disabled = !enabled;
        }
    );
}

function loadThumbnailImage(event) {
    const [file] = event.target.files;
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.addEventListener(
        "load",
        async () => {
            try {
                await browser.runtime.sendMessage({
                    message: "imageToThumbnail",
                    image: reader.result,
                    tabId: thumbnailTargetTabId,
                });
            } catch (error) {
                console.warn("Unable to send the selected thumbnail image.", error);
            }
        },
    );
    reader.addEventListener(
        "error",
        () => console.warn("Unable to read the selected thumbnail image.", reader.error),
    );
    reader.readAsDataURL(file);
    event.target.value = "";
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.addEventListener("DOMContentLoaded", enableAutosave);

for (const input of document.querySelectorAll(`input[type="file"], input[type="color"]`)) {
    input.addEventListener("click", () => nativePickerOpen = true);
}

window.addEventListener("focus", () => nativePickerOpen = false);
window.addEventListener(
    "blur",
    () => {
        if (isStandalonePopup && !nativePickerOpen) {
            window.close();
        }
    }
);

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
    () => browser.runtime.sendMessage({
        message: "generateThumbnail",
        tabId: thumbnailTargetTabId,
    }),
);
document.querySelector("#loadThumbnailButton").addEventListener(
    "click",
    () => document.querySelector("#thumbnailFile").click(),
);
document.querySelector("#thumbnailFile").addEventListener(
    "change",
    loadThumbnailImage,
);

browser.storage.onChanged.addListener(restoreOptions);

browser.bookmarks.getTree().then(
    (folders) => {
        loadBookmarkTree(folders);
        maybeSelectFolder();
    }
);
