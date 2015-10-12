/* global addon */

function initFormHandler() {
    let form = document.querySelector("form");

    function extractData() {
        let data = {};
        for (let formElement of form.elements) {
            if (formElement.type != "submit") {
                data[formElement.name] = formElement.value.trim() || undefined;
            }
        }
        if (data.tags) {
            data.tags = data.tags.split(",");
        }
        return data;
    }

    function onSubmit(event) {
        event.preventDefault();
        addon.port.emit("save", extractData());
        return false;
    }

    form.addEventListener("submit", onSubmit, false);
    form.elements[0].focus();
}

document.addEventListener("DOMContentLoaded", initFormHandler, false);
