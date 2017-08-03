const OPTION_BACKGROUND_COLOR = "option_background_color";
const OPTION_BACKGROUND_IMAGE_URL = "option_background_image_url";

let backgroundColor = undefined;
let backgroundImageURL = undefined;

function getBackgroundStyleString() {
    return `
        body {
            background-attachment: fixed;
            background-color: ${backgroundColor};
            background-image: url(${backgroundImageURL});
            background-position: center;
            background-repeat: no-repeat;
            background-size: contain;
        }
    `;
}

function onPreferencesChanged(changes) {
    if (changes[OPTION_BACKGROUND_COLOR]) {
        backgroundColor = changes[OPTION_BACKGROUND_COLOR].newValue;
    }
    if (changes[OPTION_BACKGROUND_IMAGE_URL]) {
        backgroundImageURL = changes[OPTION_BACKGROUND_IMAGE_URL].newValue;
    }
    $("style#backgroundStyle").text(getBackgroundStyleString());
}

function initFromPreferences() {
    browser.storage.local.get([
        OPTION_BACKGROUND_COLOR,
        OPTION_BACKGROUND_IMAGE_URL,
    ]).then(
        (result) => {
            backgroundColor = result[OPTION_BACKGROUND_COLOR];
            backgroundImageURL = result[OPTION_BACKGROUND_IMAGE_URL];
            $("style#backgroundStyle").text(getBackgroundStyleString());
        }
    );
}
browser.storage.onChanged.addListener(onPreferencesChanged);
initFromPreferences();
