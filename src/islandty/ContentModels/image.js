const path = require('path');
const defaultContentModel = require('./default.js');
require('dotenv').config();

module.exports = {
  /**
   * Async version of ingest that properly awaits the default model
   */
  async ingest(item, inputMediaPath, outputDir) {
    try {
      // Await the async operation from the default model
      await defaultContentModel.ingest(item, inputMediaPath, outputDir);
    } catch (err) {
      console.error(`Error in media_audio ingest: ${err.message}`);
      throw err; // Propagate the error
    }
  },

  /**
   * Sync method remains unchanged as it just delegates to sync operation
   */
  updateFilePaths(item) {
    // This remains synchronous as the base implementation is sync
    defaultContentModel.updateFilePaths(item);
  }
};
