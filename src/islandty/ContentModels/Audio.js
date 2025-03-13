const fs = require('fs').promises;
const path = require('path');
const defaultContentModel = require('./default.js');
require('dotenv').config();

module.exports = {
  async ingest(item, inputMediaPath, outputDir) {
    try {
      await defaultContentModel.ingest(item, inputMediaPath, outputDir);
      await this.createDirectoryStructure(
        {
          media_audio_track: this.parseFieldTrack(
            item['media:audio:field_track']
          )
},
        inputMediaPath,
        outputDir
      );
    } catch (err) {
      throw new Error(`Media audio ingestion failed: ${err.message}`);
    }
  },

  updateFilePaths(item) {
    defaultContentModel.updateFilePaths(item);

    if (item['media:audio:field_track']) {
      item['media:audio:field_track'] = this.parseFieldTrack(
        item['media:audio:field_track']
      );
    }
  },

  parseFieldTrack(fieldTrackStr) {
    const result = {};

    if (!fieldTrackStr || typeof fieldTrackStr !== 'string') {
      throw new Error(`Invalid field track input: ${typeof fieldTrackStr}`);
    }

    const entries = fieldTrackStr.split('|').filter(entry => entry.trim() !== '');

    for (const [index, entry] of entries.entries()) {
      const parts = entry.split(':').map(part => part.trim());

      if (parts.length < 4) {
        throw new Error(
          `Invalid field track entry at position ${index + 1}: ` +
          `'${entry}' - requires at least 4 components`
        );
      }

      const [category, type, lang, ...pathParts] = parts;
      const filePath = pathParts.join(':');

      if (!category || !type || !lang || !filePath) {
        throw new Error(
          `Incomplete field track entry at position ${index + 1}: ` +
          `'${entry}' - missing required component`
        );
      }

      if (typeof filePath !== 'string' || filePath.trim() === '') {
        throw new Error(
          `Empty file path in field track entry at position ${index + 1}: '${entry}'`
        );
      }

      result[category] = result[category] || {};
      const categoryObj = result[category];

      categoryObj[type] = categoryObj[type] || {};
      const typeObj = categoryObj[type];

      typeObj[lang] = typeObj[lang] || [];
      typeObj[lang].push(filePath);
    }

    return result;
  },

  async createDirectoryStructure(obj, inputPath, rootPath) {
    try {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path.join(rootPath, key);

        if (this.isDirectoryNode(value)) {
          await fs.mkdir(currentPath, { recursive: true });
          await this.createDirectoryStructure(value, inputPath, currentPath);
        } else {
          await fs.mkdir(currentPath, { recursive: true });
          const files = Array.isArray(value) ? value : [value];

          // Validate all files first
          files.forEach((filePath, index) => {
            if (typeof filePath !== 'string' || filePath.trim() === '') {
              throw new Error(
                `Invalid file path at position ${index + 1} in ${currentPath}: ` +
                `'${filePath}'`
              );
            }
          });

          await Promise.all(files.map(async (filePath) => {
            const fileName = path.basename(filePath);
            if (!fileName) {
              throw new Error(`Empty filename in path: ${filePath}`);
            }

            const destPath = path.join(currentPath, fileName);
            const sourcePath = path.resolve(path.join(inputPath, filePath));

            try {
              await fs.copyFile(sourcePath, destPath);
            } catch (err) {
              throw new Error(
                `Failed to copy ${sourcePath} to ${destPath}: ${err.message}`
              );
            }
          }));
        }
      }
    } catch (err) {
      throw new Error(`Directory structure creation failed: ${err.message}`);
    }
  },

  isDirectoryNode(value) {
    return typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.values(value).every(v => typeof v === 'object');
  }
};
