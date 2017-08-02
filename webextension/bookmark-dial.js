const OPTION_BACKGROUND_COLOR = "option_background_color";

const BACKGROUND_STYLE = makeStyle();

function makeStyle() {
    let style = document.createElement("style");
    style.type = "text/css";
    document.head.appendChild(style);
    return style;
}

function getBackgroundStyleString(backgroundColor) {
    return `
        body, html {
            background: ${backgroundColor};
        }
    `;
}

function onPreferencesChanged(changes) {
    if (changes[OPTION_BACKGROUND_COLOR]) {
        let backgroundColor = changes[OPTION_BACKGROUND_COLOR].newValue;
        $("style#backgroundStyle").text(getBackgroundStyleString(backgroundColor));
    }
}
function initFromPreferences() {
    browser.storage.local.get([
        OPTION_BACKGROUND_COLOR,
    ]).then(
        (result) => {
            let backgroundColor = result[OPTION_BACKGROUND_COLOR];
            $("style#backgroundStyle").text(getBackgroundStyleString(backgroundColor));
        }
    );
}
browser.storage.onChanged.addListener(onPreferencesChanged);
initFromPreferences();
