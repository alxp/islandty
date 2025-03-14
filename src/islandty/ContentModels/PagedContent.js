const { build:buildIiif } = require('biiif');
const fs = require('fs');
const path = require('path');
const defaultContentModel = require('./default.js');
const { getChildContent, generateIiifMetadata } = require('../../_data/islandtyHelpers.js');
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
        const baseName = fileName.replace(/\.[^/.]+$/, "");
        const outputPath =  path.join(outputDir, 'iiif', '_' + baseName);
        if (!fs.existsSync(outputPath)){
          fs.mkdirSync(outputPath, { recursive: true });
        }

        fs.copyFile(inputFile, path.join(outputPath, fileName), (err) => {
          if (err) {
            console.log(`Error copying ${outputPath}:`, err);
          }
          else     {
            console.log(`Wrote ${outputPath}.`);

            var hocrFile = '';
            if (page.hocr) {
              hocrFile = path.join(inputMediaPath, page.hocr);
            }
            else {
              // Check if an hOCR file exists with the same name
              // as the image file even if it's not in the CSV.
              const potentialHocrFile = path.join(path.dirname(inputFile), baseName + ".hocr");
              if (fs.existsSync(potentialHocrFile)) {
                console.log(`Found hOCR file ${potentialHocrFile} not in CSV.`);
                hocrFile = potentialHocrFile;
                page.hocr = hocrFile;
              }
              if (hocrFile.length > 0) {
                const hocrFileName = path.basename(hocrFile);

                fs.copyFile(hocrFile, path.join(outputPath, hocrFileName), (err) => {
                  if (err) {
                    console.log(`Error copying ${hocrFile}:`, err);
                  }
                  else     {
                    console.log('Wrote ' + path.join(outputPath, hocrFileName));
                  }
                });
              }
            }
          }
        });
      });

      // Generate the IIIF manifest and tiles with Biiif.
      let iiifPath = path.join(outputDir, 'iiif');
      generateIiifMetadata(item, iiifPath);
      const prefix = process.env.pathPrefix;
      const pathPrefix = prefix ? prefix : '/';

      buildIiif(iiifPath, process.env.serverHost + path.join('/', pathPrefix, process.env.contentPath, item.id, 'iiif'));
    }
    defaultContentModel.ingest(item, inputMediaPath, outputDir);
  },
  updateFilePaths(item) {
    defaultContentModel.updateFilePaths(item);
  }
}
