const OPTION_BACKGROUND_COLOR = "option_background_color";
const OPTION_BACKGROUND_IMAGE_URL = "option_background_image_url";

browser.storage.local.get([
    OPTION_BACKGROUND_COLOR,
    OPTION_BACKGROUND_IMAGE_URL,
])
    .then(
        (result) => {
            if (result[OPTION_BACKGROUND_COLOR] === undefined) {
                browser.storage.local.set({[OPTION_BACKGROUND_COLOR]: "#000000"});
            }
            if (result[OPTION_BACKGROUND_IMAGE_URL] === undefined) {
                browser.storage.local.set({[OPTION_BACKGROUND_IMAGE_URL]: ""});
            }
        }
    );

function handleInstalled(details) {
    if (details.reason === "update" && details.previousVersion === "1.1.2") {
        browser.tabs.create({
            url: "update.html",
        });
    }
}
browser.runtime.onInstalled.addListener(handleInstalled);