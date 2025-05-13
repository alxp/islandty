const fs = require('fs').promises;
const path = require('path');
const islandtyHelpers = require('../_data/islandtyHelpers.js');
require('dotenv').config();

class FileSystemStorage {
  constructor(config = {}) {
    this.config = config;
  }

  async copyFiles(item, inputMediaPath, outputDir) {
    const fileFields = islandtyHelpers.getFileFields();

    await fs.mkdir(outputDir, { recursive: true });

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
          throw err;
        }
      }
    }));

    return true;
  }

  async updateFilePaths(item) {
    const fileFields = islandtyHelpers.getFileFields();
    fileFields.forEach((fileField) => {
      if (item[fileField] && item[fileField] !== "" && item[fileField] !== 'False') {
        const fileName = path.basename(item[fileField]);
        item[fileField] = `/${path.join(process.env.contentPath, item.id, fileName)}`;
      }
    });

    if (item['extracted']) {
      const extractedText = await fs.readFile(path.join(process.env.outputDir, item['extracted']), { encoding: 'utf8' });
      item['extractedText'] = extractedText;
    }
  }
}

class OCFLStorage {
  constructor(config = {}) {
    this.config = config;
    this.ocfl = require('@ocfl/ocfl-fs');
    this.storage = null;
    this.ocflWebRoot = path.join(process.env.outputDir, 'ocfl-files');
  }

  async initialize() {
    try {
      this.storage = await this.ocfl.createStorage({
        root: this.ocflWebRoot,
        layout: this.config.layout || 'FlatDirectStorageLayout'
      });
      console.log(`OCFL storage initialized at ${this.ocflWebRoot}`);
    } catch (error) {
      try {
        this.storage = await this.ocfl.loadStorage({
          root: this.ocflWebRoot
        });
        console.log(`Existing OCFL storage loaded from ${this.ocflWebRoot}`);
      } catch (error) {
        console.error('Failed to initialize OCFL storage:', error);
        throw error;
      }
    }
    return this;
  }

  async copyFiles(item, inputMediaPath, outputDir) {
    if (!this.storage) await this.initialize();

    const objectId = item.id;
    const object = this.storage.object(objectId);

    const fileFields = islandtyHelpers.getFileFields();
    const importItems = [];

    for (const fileField of fileFields) {
      if (item[fileField] && item[fileField] !== "" && item[fileField] !== 'False') {
        const inputFile = path.join(inputMediaPath, item[fileField]);
        const fileName = path.basename(inputFile);
        importItems.push([inputFile, fileName]);
      }
    }

    try {
      await object.import(importItems);
      console.log(`Successfully imported files to OCFL object ${objectId}`);
      return true;
    } catch (err) {
      console.error(`Error importing to OCFL object ${objectId}:`, err);
      throw err;
    }
  }

  async updateFilePaths(item) {
    const fileFields = islandtyHelpers.getFileFields();

    fileFields.forEach((fileField) => {
      if (item[fileField] && item[fileField] !== "" && item[fileField] !== 'False') {
        const fileName = path.basename(item[fileField]);
        // Direct path to the file in OCFL structure
        item[fileField] = `/ocfl-files/${item.id}/v1/content/${fileName}`;
      }
    });

    if (item['extracted']) {
      try {
        const object = this.storage.object(item.id);
        const extractedPath = path.basename(item['extracted']);
        const extractedText = await object.read(extractedPath);
        item['extractedText'] = extractedText.toString('utf8');
        // Update extracted path to match OCFL structure
        item['extracted'] = `/ocfl-files/${item.id}/v1/content/${extractedPath}`;
      } catch (error) {
        console.error(`Error reading extracted text from OCFL object ${item.id}:`, error);
        item['extractedText'] = '';
      }
    }
  }
}

module.exports = {
  FileSystemStorage,
  OCFLStorage,
  createStorageHandler: async (config) => {
    if (config?.ocfl === true) {
      const handler = new OCFLStorage(config);
      return handler.initialize();
    }
    return new FileSystemStorage(config);
  }
};
