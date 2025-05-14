// src/islandty/ContentModels/Audio.js
const DefaultContentModel = require('./default.js');
const mediaHelpers = require('../lib/MediaHelpers.js');
const path = require('path');

class AudioContentModel extends DefaultContentModel {
  async ingest(item, inputMediaPath, outputDir) {
    try {
      await super.ingest(item, inputMediaPath, outputDir);

      if (item['media:audio:field_track']) {
        const tracks = mediaHelpers.parseFieldTrack(item['media:audio:field_track']);
        for (const track of tracks) {
          await this.storageHandler.copyFiles(
            { [track.file]: track.file },
            inputMediaPath,
            outputDir
          );
        }
      }
    } catch (err) {
      throw new Error(`Audio ingestion failed: ${err.message}`);
    }
  }

  async updateFilePaths(item) {
    await super.updateFilePaths(item);

    if (item['media:audio:field_track']) {
      const basePath = await this.storageHandler.getContentBasePath(item.id);
      item['media:audio:field_track'] = this.updateTrackField(
        item['media:audio:field_track'],
        basePath
      );
    }
  }

  updateTrackField(trackField, basePath) {
    const tracks = mediaHelpers.parseFieldTrack(trackField);
    for (const track of tracks) {
      const fileName = path.basename(track.file);
      track.file = path.join(basePath, fileName);
    }
    return mediaHelpers.serializeFieldTrack(tracks);
  }
}

module.exports = AudioContentModel;
