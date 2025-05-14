const path = require('path');
const islandtyHelpers = require('../../_data/islandtyHelpers.js');
const { createStorageHandler } = require('../storageHandler');
require('dotenv').config();

module.exports = {
  async init() {
    this.storageHandler = await createStorageHandler(process.env.storageConfig ?
      JSON.parse(process.env.storageConfig) : {});
    return this;
  },

  async ingest(item, inputMediaPath, outputDir) {
    await this.storageHandler.copyFiles(item, inputMediaPath, outputDir);
  },

  async updateFilePaths(item) {
    const fileFields = islandtyHelpers.getFileFields();

    for (const field of fileFields) {
      if (item[field]?.trim()) {
        const fileName = path.basename(item[field]);
        item[field] = await this.storageHandler.getFullContentPath(item.id, fileName);
      }
    }

    if (item.extracted) {
      item.extractedText = await this.readExtractedText(item);
    }
  },

  async readExtractedText(item) {
    // Implementation that works with both storage backends
  }
};
