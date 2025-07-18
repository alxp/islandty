const axios = require('axios');
const fs = require('fs').promises;
const { createWriteStream } = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const islandtyHelpers = require('../_data/islandtyHelpers.js');
const { src } = require('gulp');
require('dotenv').config();

class StorageBase {

  constructor(config = {}) {
    this.config = config;
    this.tempDirs = []; // Track temp directories for cleanup
  }

  async calculateFileHash(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha512').update(fileBuffer).digest('hex');
  }

  async copyFiles(item, filesMap, inputMediaPath, outputDir) {
    throw new Error('Not implemented');
  }

  async downloadFileFromUrl(url, destDir) {
    try {
      const tempDir = path.join(os.tmpdir(), 'islandty-downloads', destDir);
      await fs.mkdir(tempDir, { recursive: true });
      this.tempDirs.push(tempDir); // Track for cleanup

      const fileName = path.basename(new URL(url).pathname);
      const tempPath = path.join(tempDir, fileName);
      console.log(`Downloading ${url} to ${tempPath}`);

      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        httpsAgent: new https.Agent({ rejectUnauthorized: false }) // For self-signed certs
      });

      const writer = createWriteStream(tempPath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      return tempPath;
    } catch (e) {
      console.log('Error downloading file at ' + url + '. ' + e);
      await this.cleanup(); // Cleanup on error
      throw e;
    }
  }

  async cleanup() {
    for (const dir of this.tempDirs) {
      try {
        await fs.rm(dir, { recursive: true, force: true });
        console.log(`Cleaned up temporary directory: ${dir}`);
      } catch (e) {
        console.error(`Error cleaning up temporary directory ${dir}:`, e);
      }
    }
    this.tempDirs = []; // Reset array
  }

  isOCFL() {
    return false;
  }

  async fetchHeaders(url) {
    try {
      const response = await axios.head(url);
      if (response.status == 200) {
        return response.headers;
      }
      return false;
    } catch (er) {
      return er.message;
    }
  }

  getContentBasePath(itemId) {
    throw new Error('Not implemented');
  }

  getFullContentPath(item, field) {
    throw new Error('Not implemented');
  }
}

class FileSystemStorage extends StorageBase {
  constructor(config = {}) {
    super(config);
  }

  async copyFiles(item, filesMap, inputMediaPath, outputDir) {
    await fs.mkdir(outputDir, { recursive: true });

    // Create result map to store web paths
    const resultMap = {};

    await Promise.all(Object.entries(filesMap).map(async ([srcPath, destPath]) => {
      const fullDestPath = path.join(outputDir, destPath);
      const destDir = path.dirname(fullDestPath);
      let fullSrcPath = false;

      // Compute web path relative to site root
      const relativePath = path.relative(process.env.outputDir, fullDestPath);
      const webPath = '/' + relativePath.split(path.sep).join('/');

      resultMap[srcPath] = {};

      resultMap[srcPath]['destPath'] = destPath;

      try {
        // Create directory structure if needed
        await fs.mkdir(destDir, { recursive: true });
        let canSkip = false;

        if (srcPath.startsWith('http')) {
          fullSrcPath = srcPath;
          // Check file size and modified date to determine if we need to re-download
          try {
            const destStats = await fs.stat(fullDestPath);
            const srcStats = await this.fetchHeaders(fullSrcPath);
            canSkip = srcStats['content-length'] == destStats.size &&
              Date.parse(srcStats['last-modified']) <= Date.parse(destStats.mtime);
          } catch (e) {
            console.log('Error checking file stats: ' + e);
          }

          if (!canSkip) {
            fullSrcPath = await this.downloadFileFromUrl(fullSrcPath, destDir);
          }
        } else if (srcPath.startsWith('/')) {
          fullSrcPath = srcPath;
        } else {
          fullSrcPath = path.join(process.env.inputMediaPath, srcPath);
        }

        if (!canSkip) {
          await fs.copyFile(fullSrcPath, fullDestPath);
          console.log(`Copied ${srcPath} to ${fullDestPath}`);
        } else {
          console.log(`Skipping ${srcPath} as it is unmodified.`);
        }

        resultMap[srcPath]['actualSrc'] = fullSrcPath;
        resultMap[srcPath]['digest'] = await this.calculateFileHash(fullDestPath);
        resultMap[srcPath]['webPath'] = webPath;
        for (const fileField of islandtyHelpers.getFileFields()) {
          if (item[fileField] == srcPath) {
            item[fileField] = webPath;
            item[fileField + '_digest'] = resultMap[srcPath]['digest'];
          }
        }
      } catch (err) {
        console.error(`Error copying ${srcPath}:`, err);
        throw err;
      }
    }));





    return resultMap;
  }

  getContentBasePath(itemId) {
    return `/${path.join(process.env.contentPath, itemId)}`;
  }

  getFullContentPath(item, field) {
    return `/${path.join(process.env.contentPath, item.id, path.basename(item[field]))}`;
  }
}

class OCFLStorage extends StorageBase {
  constructor(config = {}) {
    super(config);
    this.ocfl = require('@ocfl/ocfl-fs');
    this.storage = null;
    this.ocflWebRoot = process.env.ocflRoot ||
      path.join(process.env.outputDir, 'ocfl-files');
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

  async filesChanged(object, importItems) {
    try {
      // Check if object exists and has files
      const exists = await this.objectExists(object);
      if (!exists) return true; // New object needs first version

      const currentFiles = new Map();
      const files = await object.files();

      // Get current files from latest version
      for (const file of files) {
        const hash = file.digest;
        currentFiles.set(file.path, hash);
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

  async copyFiles(item, filesMap, inputMediaPath, outputDir) {
    if (!this.storage) await this.initialize();
    const objectId = item.id;
    const object = this.storage.object(objectId);

    // Build result map to store web paths
    const resultMap = {};
    const baseContentPath = await this.getContentBasePath(objectId);

    // Process files and download remote files
    const importItems = [];
    for (const [srcPath, destPath] of Object.entries(filesMap)) {
      let actualSrc = srcPath;

      // Handle remote files
      if (srcPath.startsWith('http')) {
        actualSrc = await this.downloadFileFromUrl(srcPath, objectId);
      } else if (srcPath.startsWith('/')) {
        actualSrc = srcPath;
      } else {
        actualSrc = path.join(process.env.inputMediaPath, srcPath);
      }

      importItems.push([actualSrc, destPath]);
      resultMap[srcPath] = {};
      resultMap[srcPath]['actualSrc'] = actualSrc;
      resultMap[srcPath]['destPath'] = destPath;
      resultMap[srcPath]['digest'] = await this.calculateFileHash(actualSrc);
    }

    const changesExist = await this.filesChanged(object, importItems);

    if (changesExist) {
await object.update(async (transaction) => {
        for (const [src, dest] of importItems) {
          await transaction.import(src, dest);
        }
      });
      console.log(`Updated OCFL object ${objectId} with changes`);
    } else {
      console.log(`No changes detected for OCFL object ${objectId}, skipping update`);
    }

    let newInventory = await object.getInventory();
    for (const updatedFile of newInventory.files()) {
      const fileUrlPath = '/' + path.join('ocfl-files', object.id, updatedFile.contentPath);
      const resultMapKey = Object.keys(resultMap).filter(x => resultMap[x].digest == updatedFile.digest).pop();
      if (resultMapKey) {
        resultMap[resultMapKey]['webPath'] = fileUrlPath;
        for (const fileField of islandtyHelpers.getFileFields()) {
          if (filesMap[item[fileField]] == updatedFile.logicalPath) {
            item[fileField] = fileUrlPath;
            item[fileField + '_digest'] = updatedFile.digest;
          }
        }
      }
    }
    return resultMap;
  }

  async getContentBasePath(itemId) {
    try {
      const object = this.storage.object(itemId);
      const inventory = await object.getInventory();
      return `/ocfl-files/${itemId}/${inventory.head}/content`;
    } catch (error) {
      // If no inventory exists yet (first version), default to v1
      return `/ocfl-files/${itemId}/v1/content`;
    }
  }

  async getFullContentPath(item, field) {
    const object = this.storage.object(item.id);
    const inventory = await object.getInventory();
    const filePath = inventory.getContentPath(item[field + '_digest']);

    return `/ocfl-files/${item['id']}/${filePath}`;
  }

  async objectExists(object) {
    try {
      const inventory = await object.getInventory();
      return !!inventory;
    } catch (error) {
      return false;
    }
  }

  isOCFL() {
    return true;
  }
}

module.exports = {
  FileSystemStorage,
  OCFLStorage,
  createStorageHandler: async (useOcfl) => {
    if (useOcfl) {
      const handler = new OCFLStorage({
        "ocfl": true,
        "layout": "FlatDirectStorageLayout"
      });
      return handler.initialize();
    }
    return new FileSystemStorage({ "ocfl": false });
  }
};
