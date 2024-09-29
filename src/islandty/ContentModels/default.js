const fs = require('fs');
const path = require('path');

require('dotenv').config();


module.exports = {

  /**
   * Moves an object's files into the correct directory structure.
   *
   * @param {*} item
   */
  ingest(item, inputMediaPath, outputDir) {

    ['file', 'thumbnail'].forEach((fileField) => {
      if (Object.hasOwn(item, fileField) && item[fileField] !== "") {
        const inputFile = path.join(inputMediaPath, item[fileField]);
        const fileName = inputFile.replace(/^.*[\\/]/, '');
        const outputPath = path.join(outputDir, fileName);
        fs.copyFile(inputFile, outputPath, (err) => {
          if (err) {
            console.log(`Error copying ${outputPath}:`, err);
          }
          else     {
            console.log(`Wrote ${outputPath}.`);
          }
        });
      ``}
    });
  },

  /**
   * Alter the file paths to be relative to where
 they will end up.   *
   *
  * E.g.,
  * Bef ore:                        After:
  * inputdata/books/1/p33/p33.tiff  [contentPath/1/p33.tiff
   * @param {*} item
   *    The item array.
   */
  updateFilePaths(item) {
    ['file', 'thumbnail'].forEach((fileField) => {
      if (Object.hasOwn(item, fileField) && item['fileField'] !== "") {
        const outputDir = path.join(process.env.contentPath, item.id);
        const fileName = item[fileField].replace(/^.*[\\/]/, '');
        item[fileField] = path.join (outputDir, fileName);
      }
    });
  }
}
