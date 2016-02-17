const file = require("sdk/io/file");
const path = require("sdk/fs/path");

function readBinaryDataFromFile(filename) {
    var data = null;
    if (file.exists(filename)) {
        var ByteReader = file.open(filename, "rb");
        if (!ByteReader.closed) {
            data = ByteReader.read();
            ByteReader.close();
        }
    }

    return data;
}

function writeBinaryDataToFile(data, filename) {
    var ByteWriter = file.open(filename, "wb");
    if (!ByteWriter.closed) {
        ByteWriter.write(data);
        ByteWriter.close();
    }
}

function copy(from, to) {
    writeBinaryDataToFile(readBinaryDataFromFile(from), to);
}

exports.copy = copy;

function purgeDirectory(directory) {
    for (let filename of file.list(directory)) {
        let currentPath = path.join(directory, filename);
        if (file.isFile(currentPath)) {
            file.remove(currentPath);
        } else {
            purgeDirectory(currentPath);
        }
    }

    file.rmdir(directory);
}

exports.purgeDirectory = purgeDirectory;
