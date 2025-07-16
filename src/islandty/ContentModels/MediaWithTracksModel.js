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
        files[relPath] = destPath;
      });
    }
Object.entries(files)

    return files;
  }

  async ingest(item, inputMediaPath, outputDir) {
    const files = {
      ...this.buildFilesList(item, inputMediaPath, outputDir),
      ...await this.buildMetadataFiles(item)
    };
    const resultMap = await this.storageHandler.copyFiles(item, files, inputMediaPath, outputDir);

    await this.storageHandler.cleanup();

    if (item[this.trackField]
      && item[this.trackField] !== ''
    ) {
      const trackStructure = mediaHelpers.parseFieldTrack(item[this.trackField]);
      const trackFiles = mediaHelpers.flattenTrackStructure(trackStructure);
      item[this.trackField] = [];
      for (const trackFile of Object.entries(trackFiles)) {
        item[this.trackField].push(resultMap[trackFile]);
      }
    }
  }

}

module.exports = MediaWithTracksModel;
