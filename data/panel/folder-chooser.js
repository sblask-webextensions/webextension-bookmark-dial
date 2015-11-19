/* global addon */

function initSelect() {
    const submit = document.querySelector("input[type=submit]");
    const select = document.querySelector("select");

    function getSelectValue() {
        return select.options[select.selectedIndex].value;
    }

    function idForValue(value) {
        return value.replace(/[/ ]/g, "").toLowerCase();
    }

    function buildOption(value, label, defaultValue) {
        // substract 2 for leading and trailing slash;
        const level = (value.match(/\//g) || []).length - 2;

        const option = document.createElement("option");
        option.setAttribute("class", "level" + level);
        option.setAttribute("id", idForValue(value));
        option.setAttribute("value", value);
        option.text = label;

        if (value === defaultValue) {
            option.setAttribute("selected", "selected");
        }

        return option;
    }

    function fillSelect() {
        for (let tuple of addon.options.bookmarkFolders) {
            let [value, label] = tuple;
            select.appendChild(buildOption(value, label, addon.options.chosenFolder));
        }
    }

    if (addon.options.saveOnSelect) {
        select.addEventListener("change", function() {
            addon.port.emit("save", getSelectValue());
        });
    }

    // submit on enter
    select.addEventListener("keypress", function(event) {
        if (submit && event.keyCode === 13) {
            // form.submit() does not trigger validation, so use click on submit
            submit.click();
        }
    });

    fillSelect();
}

document.addEventListener("DOMContentLoaded", initSelect, false);
