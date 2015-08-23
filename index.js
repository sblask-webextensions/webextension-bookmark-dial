const core = require("sdk/view/core");
const data = require("sdk/self").data;
const tabs = require("sdk/tabs");

function clearUrlBar(tab) {
    let lowLevelWindow = core.viewFor(tab.window);
    let urlBar = lowLevelWindow.document.getElementById("urlbar").inputField;
    if (urlBar.value === data.url("bookmark_dial.html")) {
        urlBar.value = "";
    }
    urlBar.focus();
}

function maybeLoadBookmarDial(tab) {
    if (tab.url == "about:newtab") {
        tab.url = data.url("bookmark_dial.html");
        tab.on("load", clearUrlBar);
        tab.on("activate", clearUrlBar);
    }
}

function arePropertiesReliable(tab) {
    return tab.readyState !== "uninitialized" && tab.readyState !== "loading";
}

function onTabOpen(tab) {
    if (arePropertiesReliable(tab)) {
        maybeLoadBookmarDial(tab);
    } else {
        tab.on("ready", maybeLoadBookmarDial);
    }
}

tabs.on("open", onTabOpen);
