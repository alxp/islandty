const { build: buildIiif } = require('biiif');
const { promises: fs } = require('fs');
const path = require('path');
const DefaultContentModel = require('./default.js');
const { getChildContent, generateIiifMetadata } = require('../../_data/islandtyHelpers.js');
const readCSV = require('../../_data/readCSV.js');
require('dotenv').config();

class PagedContentModel extends DefaultContentModel {
  async ingest(item, inputMediaPath, outputDir) {
    console.log("Processing paged content model ingest");

    try {
      // 1. Process core files through storage handler (preservation copies)
      await super.ingest(item, inputMediaPath, outputDir);

      // 2. Always process IIIF derivatives to filesystem (working copies)
      const { items: allItems } = await readCSV();
      const pages = getChildContent(allItems, item.id);

      if (pages.length > 0) {
        const iiifPath = path.join(
          process.env.outputDir,
          process.env.contentPath,
          item.id,
          'iiif'
        );

        // Create IIIF directory structure and copy source files
        await this.createIIIFStructure(pages, inputMediaPath, iiifPath);

        // Generate IIIF metadata and build manifest
        await this.processIIIFDerivatives(item, iiifPath);
      }

    } catch (err) {
      throw new Error(`Paged content ingestion failed: ${err.message}`);
    }
  }

  buildFilesList(item, inputMediaPath, outputDir) {
    const files = super.buildFilesList(item, inputMediaPath, outputDir);
    this.addPageFiles(files, item, inputMediaPath);
    return files;
  }

  async addPageFiles(files, item, inputMediaPath) {
    try {
      const { items: allItems } = await readCSV();
      const pages = getChildContent(allItems, item.id);

      for (const page of pages) {
        if (page.file) {
          const inputFile = path.join(inputMediaPath, page.file);
          const fileName = path.basename(page.file);

          // Store in OCFL (if enabled) under pages directory
          files[inputFile] = path.join('pages', fileName);

          // Add hOCR files if they exist
          const hocrFile = await this.findHocrFile(page, inputMediaPath);
          if (hocrFile) {
            files[hocrFile] = path.join('pages', path.basename(hocrFile));
          }
        }
      }
    } catch (err) {
      console.error('Error adding page files:', err);
    }
  }

  async createIIIFStructure(pages, inputMediaPath, iiifPath) {
    try {
      // Process pages sequentially to maintain order
      for (const page of pages) {
        if (page.file) {
          const inputFile = path.join(inputMediaPath, page.file);
          const fileName = path.basename(inputFile);
          const baseName = fileName.replace(/\.[^/.]+$/, "");
          const pageOutputPath = path.join(iiifPath, `_${baseName}`);

          // Create underscored directory
          await fs.mkdir(pageOutputPath, { recursive: true });

          // Copy main file to IIIF working directory
          const destFile = path.join(pageOutputPath, fileName);
          await fs.copyFile(inputFile, destFile);

          // Copy hOCR file if exists
          const hocrFile = await this.findHocrFile(page, inputMediaPath);
          if (hocrFile) {
            const hocrFileName = path.basename(hocrFile);
            const hocrDest = path.join(pageOutputPath, hocrFileName);
            await fs.copyFile(hocrFile, hocrDest);
          }
        }
      }
    } catch (err) {
      console.error('Error creating IIIF structure:', err);
      throw err;
    }
  }


  async findHocrFile(page, inputMediaPath) {
    if (page.hocr) return path.join(inputMediaPath, page.hocr);

    // Check for implicit hOCR file
    const baseName = path.basename(page.file, path.extname(page.file));
    const potentialHocrFile = path.join(
      path.dirname(path.join(inputMediaPath, page.file)),
      `${baseName}.hocr`
    );

    try {
      await fs.access(potentialHocrFile);
      return potentialHocrFile;
    } catch {
      return null;
    }
  }

  async processIIIFDerivatives(item, iiifPath) {
  try {
    // Generate IIIF metadata using helper function
    generateIiifMetadata(item, iiifPath);

    // Build IIIF manifest
    const prefix = process.env.pathPrefix || '/';
    const iiifOptions = new URL(
      path.join(prefix, process.env.contentPath, item.id, 'iiif'),
      process.env.serverHost
    ).toString();

    await buildIiif(iiifPath, iiifOptions);

    // Store IIIF manifest path in frontmatter
    item.iiifManifest = path.join('iiif', 'manifest.json');

  } catch (err) {
    console.error('IIIF processing failed:', err);
    throw err;
  }
}

  async updateFilePaths(item) {
    await super.updateFilePaths(item);

    // Update IIIF manifest path
    if (item.iiifManifest) {
      item.iiifManifest = path.join(
        process.env.contentPath,
        item.id,
        'iiif',
        'manifest.json'
      );
    }
  }
}

module.exports = PagedContentModel;
