const path = require('path');
const DefaultContentModel = require('./default.js');
const mediaHelpers = require('../lib/MediaHelpers.js');

class MediaWithTracksModel extends DefaultContentModel {
  constructor(trackField) {
    super();
    this.trackField = trackField;
  }

  buildFilesList(item, inputMediaPath, outputDir) {
    const files = super.buildFilesList(item, inputMediaPath, outputDir);

    if (item[this.trackField]) {
      const trackStructure = mediaHelpers.parseFieldTrack(item[this.trackField]);
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

    if (item[this.trackField]) {
      const basePath = await this.storageHandler.getContentBasePath(item.id);
      item[this.trackField] = mediaHelpers.updateTrackField(
        item[this.trackField],
        basePath
      );
    }
  }
}

module.exports = MediaWithTracksModel;
