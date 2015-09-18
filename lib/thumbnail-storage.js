const simpleStorage = require("sdk/simple-storage");

let mapping = assertMapping();

function assertMapping() {
    if (!simpleStorage.storage.mapping) {
        console.log("Initialize storage");
        simpleStorage.storage.mapping = {};
    }
    return simpleStorage.storage.mapping;
}

function getThumbnail(url) {
    return mapping[url];
}
exports.getThumbnail = getThumbnail;

function setThumbnail(url, data) {
    mapping[url] = data;
    console.log(
        "Updated image data for " + url,
        "Data usage is now at " + simpleStorage.quotaUsage
    );
}
exports.setThumbnail = setThumbnail;

function size() {
    return Object.keys(mapping).length;
}
exports.size = size;

function registerOverQuotaHandler(handlerFunction) {
    simpleStorage.on("OverQuota", handlerFunction);
}
exports.registerOverQuotaHandler = registerOverQuotaHandler;

function cleanupAllBut(thumbnailUrlsToKeep) {
    console.log(
        "Start cleaning thumbnails",
        "count=" + size(),
        "quota=" + simpleStorage.quotaUsage
    );
    for (let url of Object.keys(mapping)) {
        if (thumbnailUrlsToKeep.indexOf(url) < 0) {
            delete mapping[url];
        }
    }
    console.log(
        "Done cleaning thumbnails",
        "count=" + size(),
        "quota=" + simpleStorage.quotaUsage
    );
}
exports.cleanupAllBut = cleanupAllBut;
