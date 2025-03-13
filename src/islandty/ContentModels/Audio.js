const fs = require('fs').promises;
const path = require('path');
const defaultContentModel = require('./default.js');
require('dotenv').config();

module.exports = {
  /**
   * Async version of ingest
   */
  async ingest(item, inputMediaPath, outputDir) {
    try {
      // Run default ingestion first
      await defaultContentModel.ingest(item, inputMediaPath, outputDir);

      // Process directory structure asynchronously
      await this.createDirectoryStructure(
        {
          media_audio_track: this.parseFieldTrack(
            item['media:audio:field_track'])
          },

        inputMediaPath,
        outputDir
      );
    } catch (err) {
      console.error(`Error in media_audio ingestion: ${err.message}`);
      throw err;
    }
  },

  /**
   * Sync method remains unchanged
   */
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

    // Handle empty or invalid input
    if (!fieldTrackStr || typeof fieldTrackStr !== 'string') {
      console.warn('Invalid field track string:', fieldTrackStr);
      return result;
    }

    const entries = fieldTrackStr.split('|').filter(entry => entry.trim() !== '');

    for (const entry of entries) {
      const parts = entry.split(':').map(part => part.trim());

      // Validate minimum required parts
      if (parts.length < 4) {
        console.warn('Skipping invalid field track entry:', entry);
        continue;
      }

      const [category, type, lang, ...pathParts] = parts;
      const filePath = pathParts.join(':'); // Re-join remaining parts as path

      // Validate critical components
      if (!category || !type || !lang || !filePath) {
        console.warn('Skipping incomplete field track entry:', entry);
        continue;
      }

      // Build nested structure with null checks
      result[category] = result[category] || {};
      const categoryObj = result[category];

      categoryObj[type] = categoryObj[type] || {};
      const typeObj = categoryObj[type];

      typeObj[lang] = typeObj[lang] || [];

      // Validate and push path
      if (typeof filePath === 'string' && filePath.trim() !== '') {
        typeObj[lang].push(filePath);
      } else {
        console.warn('Skipping empty path in entry:', entry);
      }
    }

    return result;
  },

  /**
   * Async directory structure creation
   */
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

          // Add validation for file paths
          const validFiles = files.filter(filePath =>
            typeof filePath === 'string' && filePath.trim() !== ''
          );

          if (validFiles.length !== files.length) {
            console.warn(`Skipped ${files.length - validFiles.length} invalid file paths in ${currentPath}`);
          }

          await Promise.all(validFiles.map(async (filePath) => {
            const fileName = path.basename(filePath);
            if (!fileName) {
              console.error(`Invalid file path: ${filePath}`);
              return;
            }

            const destPath = path.join(currentPath, fileName);
            const sourcePath = path.resolve(path.join(inputPath, filePath));

            try {
              await fs.copyFile(sourcePath, destPath);
              console.log(`Copied ${sourcePath} to ${destPath}`);
            } catch (err) {
              console.error(`Failed to copy ${sourcePath} to ${destPath}:`, err);
              throw err;
            }
          }));
        }
      }
    } catch (err) {
      console.error('Error creating directory structure:', err);
      throw err;
    }
  },

  isDirectoryNode(value) {
    return typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.values(value).every(v => typeof v === 'object');
  }
};
