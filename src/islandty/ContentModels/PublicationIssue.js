const path = require('path');
const { promises: fs } = require('fs');
const defaultContentModel = require('./default.js');
const { ingest } = require('./PagedContent.js'); // Reuse core functionality
require('dotenv').config();

module.exports = {
  async ingest(item, inputMediaPath, outputDir) {
    try {
      // Reuse IIIF processing from PagedContent
      await ingest(item, inputMediaPath, outputDir);

      // Add any PublicationIssue-specific processing here

      // Process default ingestion
      await defaultContentModel.ingest(item, inputMediaPath, outputDir);
    } catch (err) {
      throw new Error(`Publication issue ingestion failed: ${err.message}`);
    }
  },

  updateFilePaths(item) {
    defaultContentModel.updateFilePaths(item);
  }
};
