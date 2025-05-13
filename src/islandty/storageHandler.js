const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
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

  async calculateFileHash(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  async filesChanged(object, importItems) {
    try {
      const currentFiles = new Map();

      // Get current files and their hashes from latest version
      for await (const file of object.files()) {
        const content = await object.read(file);
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        currentFiles.set(file, hash);
      }

      // Check if any files are different
      for (const [src, dest] of importItems) {
        const newHash = await this.calculateFileHash(src);
        if (currentFiles.has(dest)) {
          if (currentFiles.get(dest) !== newHash) {
            return true; // File content changed
          }
        } else {
          return true; // New file added
        }
      }

      // Check for deleted files
      const importedFiles = new Set(importItems.map(([_, dest]) => dest));
      for (const existingFile of currentFiles.keys()) {
        if (!importedFiles.has(existingFile)) {
          return true; // File was deleted
        }
      }

      return false; // No changes detected
    } catch (error) {
      console.error('Error comparing files:', error);
      return true; // Assume changes if we can't compare
    }
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
      // Check if files have changed
      const changesExist = await this.filesChanged(object, importItems);

      if (changesExist) {
        console.log(`Changes detected, creating new version for object ${objectId}`);
        await object.update(async (transaction) => {
          for (const [src, dest] of importItems) {
            await transaction.import(src, dest);
          }
        });
        console.log(`Created new version for object ${objectId}`);
      } else {
        console.log(`No changes detected for object ${objectId}, keeping current version`);
      }

      return true;
    } catch (err) {
      console.error(`Error processing OCFL object ${objectId}:`, err);
      throw err;
    }
  }

  async updateFilePaths(item) {
    const fileFields = islandtyHelpers.getFileFields();

    try {
      const object = this.storage.object(item.id);
      const inventory = await object.getInventory();
      const latestVersion = inventory.head;

      fileFields.forEach((fileField) => {
        if (item[fileField] && item[fileField] !== "" && item[fileField] !== 'False') {
          const fileName = path.basename(item[fileField]);
          // Use latest version path
          item[fileField] = `/ocfl-files/${item.id}/${latestVersion}/content/${fileName}`;
        }
      });

      if (item['extracted']) {
        try {
          const extractedPath = path.basename(item['extracted']);
          const extractedText = await object.read(extractedPath);
          item['extractedText'] = extractedText.toString('utf8');
          item['extracted'] = `/ocfl-files/${item.id}/${latestVersion}/content/${extractedPath}`;
        } catch (error) {
          console.error(`Error reading extracted text from OCFL object ${item.id}:`, error);
          item['extractedText'] = '';
        }
      }
    } catch (error) {
      console.error(`Error updating paths for object ${item.id}:`, error);
      throw error;
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
