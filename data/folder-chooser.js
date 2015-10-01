var select = window.document.getElementsByTagName("select")[0];

function getSelectValue() {
    return select.options[select.selectedIndex].value;
}

function idForValue(value) {
    return value.replace(/[/ ]/g, "").toLowerCase();
}

function buildOption(value, label, defaultValue) {
    let selected = value === defaultValue ? " selected='selected'" : "";
    let level = (value.match(/\//g) || []).length - 2; // leading and trailing /;
    /* eslint indeint: 0 */
    return [
        "<option",
        " id='" + idForValue(value) + "'",
        selected,
        " value='" + value + "'",
        " class='level" + level + "'",
        ">",
        label,
        "</option>",
    ].join("\n");
}

function fillSelect() {
    let listOfOptions = [];
    for (let tuple of self.options.bookmarkFolders) {
        let [value, label] = tuple;
        listOfOptions.push(buildOption(value, label, self.options.chosenFolder));
    }
    select.innerHTML = listOfOptions.join("\n");
}

if (self.options.saveOnSelect) {
    select.addEventListener("change", function(){
        self.port.emit("save", getSelectValue());
    });
}

fillSelect();
