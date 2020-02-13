const OPTION_BACKGROUND_COLOR = "option_background_color";
const OPTION_BACKGROUND_IMAGE_URL = "option_background_image_url";
const OPTION_BACKGROUND_SIZE = "option_background_size";
const OPTION_BOOKMARK_FOLDER = "option_bookmark_folder";
const OPTION_COLUMN_COUNT = "option_column_count";
const OPTION_CUSTOM_CSS = "option_custom_css";

const THUMBNAIL_STORAGE_PREFIX = "thumbnail_";

const FOLDER_SELECT = document.querySelector("#folderSelect");

const SETTING_IMG_URL = "setting_img_url";

function createNode(html){
    const el = document.createElement("div");
    el.innerHTML = html;
    return el.firstElementChild;
}

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

            setBooleanValue("backgroundSize" + result[OPTION_BACKGROUND_SIZE].charAt(0).toUpperCase() + result[OPTION_BACKGROUND_SIZE].slice(1), true);

            let numberOfColumnsIndex = result[OPTION_COLUMN_COUNT] || 0;
            document.getElementById("columnCount").options[numberOfColumnsIndex].setAttribute("selected", true);

            setTextValue("customCSS", result[OPTION_CUSTOM_CSS]);
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

function setBooleanValue(elementID, newValue) {
    document.getElementById(elementID).checked = newValue;
}

function saveOptions(event) {
    if (event) {
        event.preventDefault();
    }

    let folderSelect = document.getElementById("folderSelect");
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

async function loadBookmarkFolder(folderId) {
    const promises = (await browser.bookmarks.getChildren(folderId))
        .filter(bookmarkNode => bookmarkNode.type === "bookmark")
        .map(loadBookmarkSettings);
    return Promise.all(promises);
}

async function loadBookmarkSettings({url, title}){
    const thumbnailKey = `${THUMBNAIL_STORAGE_PREFIX}${url}`;
    const settingsKey = `settings_${url}`;
    const result = await browser.storage.local.get([
        thumbnailKey,
        settingsKey,
    ]);
    const $tabContent = document.querySelector("#tab-dials-content");
    const $dialContainer = createNode(`<div class="dial-container">
        <div class="dial-container__header">
            ${title}
        </div>
        <div class="settings-container">
            <img />
            <div class="settings-container__settings">
                <span>Img URL</span>
                <input type="text">
                <div class="buttons">
                    <div class="buttons__set-img">Set img</div>
                    <div class="buttons_reset">Reset</div>
                </div>
            </div>
        </div>
    </div>
    `);
    const thumbnail = result[thumbnailKey];
    if(thumbnail){
        $dialContainer.querySelector("img").src = thumbnail;
    }
    const settings = result[settingsKey];
    if(settings){
        $dialContainer.querySelector(".settings-container__settings input")
            .value = settings[SETTING_IMG_URL];
    }
    $dialContainer
        .querySelector(".buttons__set-img")
        .addEventListener("click",
            setDialImg.bind(this, $dialContainer, thumbnailKey));

    $tabContent.appendChild($dialContainer);
}

async function setDialImg($dialContainer, thumbnailKey){
    const $input = $dialContainer.querySelector(".settings-container__settings input");

    const responseBlob = await (await fetch($input.value)).blob();
    // Use image element to make sure what we retrieved is actually an image
    const $tempImg = document.createElement("img");
    $tempImg.src = URL.createObjectURL(responseBlob);
    await $tempImg.decode();

    // Convert image to dataURL
    const canvas = document.createElement("canvas");
    canvas.height = $tempImg.height;
    canvas.width = $tempImg.width;
    canvas.getContext("2d").drawImage($tempImg, 0, 0);

    $dialContainer.querySelector("img").src = canvas.toDataURL();

    await browser.storage.local.set({
        [thumbnailKey]: canvas.toDataURL(),
    });
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
                    enableGenerateThumbnailButton();
                    loadBookmarkFolder(bookmarkFolder);
                    break;
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

function enableGenerateThumbnailButton() {
    browser.runtime.sendMessage({ message: "isGenerateThumbnailEnabled" }).then(
        enabled => document.querySelector("#generateThumbnailButton").disabled = !enabled
    );
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.addEventListener("DOMContentLoaded", enableAutosave);

document.querySelector("#optionLink").addEventListener(
    "click",
    () => browser.runtime.openOptionsPage(),
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
    () => browser.runtime.sendMessage({ message: "generateThumbnail" }),
);

browser.storage.onChanged.addListener(restoreOptions);

browser.bookmarks.getTree().then(
    (folders) => {
        loadBookmarkTree(folders);
        maybeSelectFolder();
    }
);
