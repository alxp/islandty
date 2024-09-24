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
    const inputFile = path.join(inputMediaPath, item.file);
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
}
