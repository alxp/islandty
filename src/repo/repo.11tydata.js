
const xsltProcessor = require('xslt-processor');
require('dotenv').config();
const fs = require("fs");
const SaxonJS = require('saxon-js');

function readMODS(ModsFile) {
    output = SaxonJS.transform({
        stylesheetFileName: "./src/MODS-to-HTML.sef.json",
        sourceFileName: ModsFile,
        destination: "serialized"
    }, "sync");
    
    return output;
}

module.exports.readMODS = function (ModsFile) {
  const data = readMODS(ModsFile);
  return { modsTable: data };
};
