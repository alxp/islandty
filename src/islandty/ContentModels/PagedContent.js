const { build:buildIiif } = require('biiif');
const fs = require('fs');
const path = require('path');
const defaultContentModel = require('./default.js');
const { getChildContent, generateIiifMetadata } = require('../../_data/islandoraHelpers.js');
const readCSV = require('./../../_data/readCSV.js');
const { dest } = require('gulp');
const { domSetTransformedAttribute } = require('xslt-processor/dom/functions.js');
require('dotenv').config();

module.exports = {

  /**
   * Moves an object's files into the correct directory structure.
   *
   * @param {*} item
   */
  ingest(item, inputMediaPath, outputDir) {
    console.log("got to paged content model ingest.");
    allItems = readCSV().items;
    pages = getChildContent(allItems, item.id);
    if (pages.length > 0) {
      pages.forEach(page => {
        const inputFile = path.join(inputMediaPath, page['file']);
        const fileName = path.basename(inputFile);
        const outputPath =  path.join(outputDir, 'iiif', '_' + fileName.replace(/\.[^/.]+$/, ""));
        if (!fs.existsSync(outputPath)){
          fs.mkdirSync(outputPath, { recursive: true });
        }

        fs.copyFile(inputFile, outputPath, (err) => {
          if (err) {
            console.log(`Error copying ${outputPath}:`, err);
          }
          else     {
            console.log(`Wrote ${outputPath}.`);
          }

        });
      });

      // Generate the tiles with Biiif.
      let iiifPath = path.join(outputDir, 'iiif');
      generateIiifMetadata(item, iiifPath);
      buildIiif(iiifPath, process.env.serverHost + '/' + process.env.ContentPath + '/' + item.id + '/iiif');
    }
    defaultContentModel.ingest(item, inputMediaPath, outputDir);
  },
  updateFilePaths(item) {
    defaultContentModel.updateFilePaths(item);
  }
}
