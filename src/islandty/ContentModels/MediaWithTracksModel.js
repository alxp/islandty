import path from 'path';
import DefaultContentModel from './default.js';
import * as mediaHelpers from '../lib/MediaHelpers.js';

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

    return files;
  }

  async ingest(item, inputMediaPath, outputDir) {
    const files = {
      ...this.buildFilesList(item, inputMediaPath, outputDir),
      ...await this.buildMetadataFiles(item)
    };
    const resultMap = await this.storageHandler.copyFiles(item, files, inputMediaPath, outputDir);

    await this.storageHandler.cleanup();

    if (item[this.trackField] && item[this.trackField] !== '') {
      const trackStructure = mediaHelpers.parseFieldTrack(item[this.trackField]);

      for (const topLabel of Object.keys(trackStructure)) {
        for (const kind of Object.keys(trackStructure[topLabel])) {
          for (const lang of Object.keys(trackStructure[topLabel][kind])) {
            const paths = trackStructure[topLabel][kind][lang];
            trackStructure[topLabel][kind][lang] = paths.map(origPath => {
              const match = Object.entries(resultMap).find(
                ([key, value]) => key === origPath
              );

              return match ? match[1].webPath : origPath;
            });
          }
        }
      }

      item[this.trackField] = trackStructure;
    }
  }
}

export default MediaWithTracksModel;
