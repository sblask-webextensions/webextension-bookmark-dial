const OPTION_BACKGROUND_COLOR = "option_background_color";

browser.storage.local.get([
    OPTION_BACKGROUND_COLOR,
])
    .then(
        (result) => {
            if (result[OPTION_BACKGROUND_COLOR] === undefined) {
                browser.storage.local.set({[OPTION_BACKGROUND_COLOR]: "#000000"});
            }
        }
    );

