const DefaultContentModel = require('./default.js');
const mediaHelpers = require('../lib/MediaHelpers.js');
const path = require('path');


class AudioContentModel extends DefaultContentModel {
  buildFilesList(item, inputMediaPath, outputDir) {
    const files = super.buildFilesList(item, inputMediaPath, outputDir);

    if (item['media:audio:field_track']) {
      const trackStructure = mediaHelpers.parseFieldTrack(item['media:audio:field_track']);
      const trackFiles = mediaHelpers.flattenTrackStructure(trackStructure);

      Object.entries(trackFiles).forEach(([relPath, destPath]) => {
        const srcPath = path.join(inputMediaPath, relPath);
        // Preserve directory structure in destination path
        files[srcPath] = destPath; // destPath already includes subdirectories
      });
    }

    return files;
  }

  async updateFilePaths(item) {
    await super.updateFilePaths(item);

    if (item['media:audio:field_track']) {
      const basePath = await this.storageHandler.getContentBasePath(item.id);
      item['media:audio:field_track'] = mediaHelpers.updateTrackField(
        item['media:audio:field_track'],
        basePath
      );
    }
  }
}

module.exports = AudioContentModel;
