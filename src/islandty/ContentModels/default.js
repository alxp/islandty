const path = require('path');
const islandtyHelpers = require('../../_data/islandtyHelpers.js');
const { createStorageHandler } = require('../storageHandler');
require('dotenv').config();

class DefaultContentModel {
  async init() {
    this.storageHandler = await createStorageHandler(
      process.env.storageConfig ? JSON.parse(process.env.storageConfig) : {}
    );
    return this;
  }

  async ingest(item, inputMediaPath, outputDir) {
    const files = this.buildFilesList(item, inputMediaPath, outputDir);
    await this.storageHandler.copyFiles(files, inputMediaPath, outputDir);
  }

  buildFilesList(item, inputMediaPath, outputDir) {
    const files = {};
    const fileFields = islandtyHelpers.getFileFields();

    fileFields.forEach(field => {
      if (item[field]?.trim()) {
        const srcPath = path.join(inputMediaPath, item[field]);
        const fileName = path.basename(item[field]);
        files[srcPath] = fileName;
      }
    });

    return files;
  }

  async updateFilePaths(item) {
    const fileFields = islandtyHelpers.getFileFields();

    for (const field of fileFields) {
      if (item[field]?.trim()) {
        const fileName = path.basename(item[field]);
        item[field] = await this.storageHandler.getFullContentPath(item.id, fileName);
      }
    }

  }
}

module.exports = DefaultContentModel;
