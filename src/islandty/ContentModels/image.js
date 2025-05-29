const path = require('path');
const DefaultContentModel = require('./default.js');

class ImageContentModel extends DefaultContentModel {
  async ingest(item, inputMediaPath, outputDir, fileFields) {
    try {
      // Call parent ingest implementation
      await super.ingest(item, inputMediaPath, outputDir, fileFields);

      // Add any image-specific file operations here
    } catch (err) {
      console.error(`Error in image content model ingest: ${err.message}`);
      throw err;
    }
  }

  async updateFilePaths(item, fileFields) {
    // Call parent implementation first
    await super.updateFilePaths(item, fileFields);

    // Add any image-specific path updates here
  }
}

module.exports = ImageContentModel;
