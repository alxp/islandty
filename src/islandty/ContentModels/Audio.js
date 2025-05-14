const defaultContentModel = require('./default.js');
const mediaHelpers = require('./src/islandty/lib/MediaHelpers.js');


module.exports = {
  async init() {
    await defaultContentModel.init();
    this.storageHandler = defaultContentModel.storageHandler;
    this.defaultModel = defaultContentModel;
    return this;
  },

  async ingest(item, inputMediaPath, outputDir) {
    try {
      await this.defaultModel.ingest(item, inputMediaPath, outputDir);

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
  },

  async updateFilePaths(item) {
    await this.defaultModel.updateFilePaths(item);

    if (item['media:audio:field_track']) {
      const basePath = await this.storageHandler.getContentBasePath(item.id);
      item['media:audio:field_track'] = updateTrackField(
        item['media:audio:field_track'],
        basePath
      );
    }
  }
};
