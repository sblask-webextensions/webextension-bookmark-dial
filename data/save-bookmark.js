/* global addon */

function initFormHandler() {
    function onSubmit(event) {
        event.preventDefault();
        let data = {};
        // TODO
        addon.port.emit("save", data);
        return false;
    }

    let form = document.querySelector("form");
    form.addEventListener("submit", onSubmit, false);
}

document.addEventListener("DOMContentLoaded", initFormHandler, false);
