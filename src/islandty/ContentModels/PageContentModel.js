const DefaultContentModel = require('./default.js');

class PageContentModel extends DefaultContentModel {
  buildFilesList(item, inputMediaPath, outputDir) {
    const files = super.buildFilesList(item, inputMediaPath, outputDir);

    // Remove main page file from preservation storage (handled by parent)
    delete files[path.join(inputMediaPath, item.file)];

    return files;
  }
}

module.exports = PageContentModel;
