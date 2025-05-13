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
    try {
      await this.storageHandler.copyFiles(item, inputMediaPath, outputDir);
      return true;
    } catch (error) {
      console.error('Error in ingest:', error);
      throw error;
    }
  },

  async updateFilePaths(item) {
    await this.storageHandler.updateFilePaths(item);
  }
};
