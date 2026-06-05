import path from 'path';
import DefaultContentModel from './default.js';

class ImageContentModel extends DefaultContentModel {
  async ingest(item, inputMediaPath, outputDir) {
    try {
      // Call parent ingest implementation
      await super.ingest(item, inputMediaPath, outputDir);

      // Add any image-specific file operations here
    } catch (err) {
      console.error(`Error in image content model ingest: ${err.message}`);
      throw err;
    }
  }

}

export default ImageContentModel;
