/* global addon */

function initFormHandler() {
    let form = document.querySelector("form");

    function preProcessData(data) {
        data.tags = data.tags ? data.tags.join(", ") : "";
        return data;
    }

    function postProcess(data) {
        if (data.id) {
            data.id = parseInt(data.id);
        }

        const originalGroup = addon.options.chosenFolder;
        const chosenGroup = data.group;
        if (originalGroup !== chosenGroup) {
            data.index = undefined;
        }

        if (data.index) {
            data.index = parseInt(data.index);
        }

        data.tags = data.tags ? data.tags.split(/, */) : undefined;
        return data;
    }

    function initData() {
        const data = preProcessData(Object.assign({}, addon.options.bookmark));
        for (let formElement of form.elements) {
            if (formElement.type != "submit" && formElement.type != "group") {
                if (data[formElement.name]) {
                    formElement.value = data[formElement.name];
                }
            }
        }
    }

    function extractData() {
        const data = {};
        for (let formElement of form.elements) {
            if (formElement.type != "submit") {
                data[formElement.name] = formElement.value.trim() || undefined;
            }
        }

        return postProcess(data);
    }

    function onSubmit(event) {
        event.preventDefault();
        addon.port.emit("save", extractData());
        return false;
    }

    form.addEventListener("submit", onSubmit, false);
    form.elements[0].focus();
    initData();
}

document.addEventListener("DOMContentLoaded", initFormHandler, false);
