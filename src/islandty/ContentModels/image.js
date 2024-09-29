const fs = require('fs');
const path = require('path');
const SaxonJS = require('saxon-js');
const defaultContentModel = require('./default.js');
require('dotenv').config();


module.exports = {

  /**
   * Moves an object's files into the correct directory structure.
   *
   * @param {*} item
   */
  ingest(item, inputMediaPath, outputDir) {
    defaultContentModel.ingest(item, inputMediaPath, outputDir);
  },
  updateFilePaths(item) {
    defaultContentModel.updateFilePaths(item);
  }
}
