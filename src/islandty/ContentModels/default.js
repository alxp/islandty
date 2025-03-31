const fs = require('fs').promises;
const path = require('path');
const islandtyFieldInfo = require('../../../config/islandtyFieldInfo.json');
const islandtyHelpers = require('../../_data/islandtyHelpers.js')
require('dotenv').config();

const fileFields = islandtyHelpers.getFileFields();

module.exports = {
  /**
   * Async version of file ingestion
   */
  async ingest(item, inputMediaPath, outputDir) {
    try {
      // Create output directory if it doesn't exist
      await fs.mkdir(outputDir, { recursive: true });

      // Process all file fields in parallel
      await Promise.all(fileFields.map(async (fileField) => {
        if (item[fileField] && item[fileField] !== "" && item[fileField] !== 'False') {
          const inputFile = path.join(inputMediaPath, item[fileField]);
          const fileName = path.basename(inputFile);
          const outputPath = path.join(outputDir, fileName);

          try {
            await fs.copyFile(inputFile, outputPath);
            console.log(`Successfully copied ${outputPath}`);
          } catch (err) {
            console.error(`Error copying ${outputPath}:`, err);
            throw err; // Rethrow to catch in outer try/catch
          }
        }
      }));

      return true; // Indicate success
    } catch (error) {
      console.error('Error in ingest:', error);
      throw error; // Propagate error to caller
    }
  },

  /**
   * Synchronous path updates (no async needed)
   */
  async updateFilePaths(item) {
    fileFields.forEach((fileField) => {
      if (item[fileField] && item[fileField] !== "" && item[fileField] !== 'False') {
        const outputDir = path.join(process.env.contentPath, item.id);
        const fileName = path.basename(item[fileField]);
        item[fileField] = `/${path.join(outputDir, fileName)}`;
      }
    });
    if (item['extracted']) {
      extractedText = await fs.readFile(path.join(process.env.outputDir, item['extracted']), { encoding: 'utf8'});
      item['extractedText'] = extractedText;
    }
  }
};
