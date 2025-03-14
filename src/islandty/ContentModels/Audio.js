const fs = require('fs').promises;
const mediaHelpers = require('../lib/MediaHelpers.js');
const path = require('path');
const defaultContentModel = require('./default.js');
require('dotenv').config();

module.exports = {
  async ingest(item, inputMediaPath, outputDir) {
    try {
      await defaultContentModel.ingest(item, inputMediaPath, outputDir);
      await mediaHelpers.createDirectoryStructure(
        mediaHelpers.parseFieldTrack(
            item['media:audio:field_track']
          ),
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
      const outputDir = path.join('/', process.env.contentPath, item.id);
      item['media:audio:field_track'] = mediaHelpers.updateTrackField(item['media:audio:field_track'],outputDir);
    }
  },


};
