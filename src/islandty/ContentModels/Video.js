const path = require('path');
const DefaultContentModel = require('./default.js');
const mediaHelpers = require('../lib/MediaHelpers.js');

class VideoContentModel extends DefaultContentModel {
  buildFilesList(item, inputMediaPath, outputDir) {
    const files = super.buildFilesList(item, inputMediaPath, outputDir);

    if (item['media:video:field_track']) {
      const trackStructure = mediaHelpers.parseFieldTrack(item['media:video:field_track']);
      const trackFiles = mediaHelpers.flattenTrackStructure(trackStructure);

      Object.entries(trackFiles).forEach(([relPath, destPath]) => {
        const srcPath = path.join(inputMediaPath, relPath);
        files[srcPath] = destPath;
      });
    }

    return files;
  }

  async updateFilePaths(item) {
    await super.updateFilePaths(item);

    if (item['media:video:field_track']) {
      const basePath = await this.storageHandler.getContentBasePath(item.id);
      item['media:video:field_track'] = mediaHelpers.updateTrackField(
        item['media:video:field_track'],
        basePath
      );
    }
  }
}

module.exports = VideoContentModel;
