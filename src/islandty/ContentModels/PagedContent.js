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
      // Get child pages first
      const { items: allItems } = await readCSV();
      const pages = getChildContent(Object.values(allItems), item.id);

      const filesMap = super.buildFilesList(item, inputMediaPath, outputDir);
      await this.addPageFiles(filesMap, pages, inputMediaPath);
      const resultMap = await this.storageHandler.copyFiles(item, filesMap, inputMediaPath, outputDir);


      const iiifPath = path.join(
        process.env.outputDir,
        process.env.contentPath,
        item.id,
        'iiif'
      );

      if (pages.length > 0) {
        const needsIIIF = await this.checkIIIFNeeds(item, pages, iiifPath);

        if (needsIIIF) {
           await this.createIIIFStructure(item, pages, resultMap, inputMediaPath, iiifPath);
          await this.processIIIFDerivatives(item, iiifPath);
          await this.storeIIIFState(item, iiifPath);
        }
      }
      await this.updateFilePaths(item, resultMap);
    } catch (err) {
      throw new Error(`Paged content ingestion failed: ${err.message}`);
    }
    finally {
      this.storageHandler.cleanup();
    }

  }

  async addPageFiles(filesMap, pages, inputMediaPath) {


    for (const [index, page] of pages.entries()) {
      if (page.file) {

        const fileName = `pages/${index.toString().padStart(4, '0')}_${path.basename(page.file)}`;


        filesMap[page.file] = fileName;
        // Add hOCR file if exists
        const hocrFile = await this.findHocrFile(page, inputMediaPath);
        if (hocrFile) {
          const hocrBaseName = path.basename(hocrFile);
          const hocrFileName = `pages/${index.toString().padStart(4, '0')}_${hocrBaseName}`;
          filesMap[hocrFile] = hocrFileName;
        }
      }
    }
  }

  async checkIIIFNeeds(item, pages, iiifPath) {
    if (!this.storageHandler.isOCFL()) return true;

    try {
      const version = await this.getLatestOcflVersion(item.id);
      const iiifVersionFile = path.join(iiifPath, '.ocfl-version');

      try {
        const storedVersion = await fs.readFile(iiifVersionFile, 'utf8');
        return storedVersion.trim() !== version;
      } catch {
        return true; // Version file missing
      }
    } catch (error) {
      console.error('Error checking IIIF needs:', error);
      return true; // Force rebuild on error
    }
  }

  async storeIIIFState(item, iiifPath) {
    if (this.storageHandler.isOCFL()) {
      const object = this.storageHandler.storage.object(item.id);
      const inventory = await object.getInventory();
      await fs.writeFile(path.join(iiifPath, '.ocfl-version'), inventory.head);
    }
  }



  async createIIIFStructure(item, pages, filesMap, inputMediaPath, iiifPath) {
    for (const [index, page] of pages.entries()) {
      if (!page.file) continue
      const baseName = path.basename(page.file, path.extname(page.file));
      const underscoredDir = `_${baseName}`;
      const iiifPageDir = path.join(iiifPath, underscoredDir);

      await fs.mkdir(iiifPageDir, { recursive: true });

      // Handle main image file
      const sourcePath = filesMap[page.file]['actualSrc'];


      const destPath = path.join(iiifPageDir, path.basename(page.file));
      await fs.copyFile(sourcePath, destPath);

      // Handle hOCR file
      const hocrFile = await this.findHocrFile(page, inputMediaPath);
      if (hocrFile) {
        let hocrSource;
        if (this.storageHandler.isOCFL()) {
          const version = await this.getLatestOcflVersion(item.id);
          const ocflContentPath = path.join(
            process.env.outputDir,
            'ocfl-files',
            item.id,
            version,
            'content'
          );
          hocrSource = path.join(
            ocflContentPath,
            'pages',
            `${index.toString().padStart(4, '0')}_${path.basename(hocrFile)}`
          );
        } else {
          hocrSource = hocrFile;
        }

        const hocrDest = path.join(iiifPageDir, path.basename(hocrFile));
        await fs.copyFile(hocrSource, hocrDest);
      }
    }
  }

  async getLatestOcflVersion(objectId) {
    if (!this.storageHandler.isOCFL()) return 'v1'; // Dummy version for FS

    try {
      const object = this.storageHandler.storage.object(objectId);
      const inventory = await object.getInventory();
      return inventory.head;
    } catch (error) {
      return 'v1';
    }
  }

  async storeIIIFState(item, iiifPath) {
    if (this.storageHandler.isOCFL()) {
      // Only write version file for OCFL
      try {
        const version = await this.getLatestOcflVersion(item.id);
        await fs.writeFile(path.join(iiifPath, '.ocfl-version'), version);
      } catch (error) {
        console.error('Error storing IIIF state:', error);
      }
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

  async updateFilePaths(item, filesMap) {

    if (item.iiifManifest) {
      item.iiifManifest = path.join(
        process.env.contentPath,
        item.id,
        'iiif',
        'manifest.json'
      );
    }

    // Add direct link to IIIF manifest
    item.iiif_manifest_url = `${process.env.serverHost}/${item.iiifManifest}`;
  item.extracted}
}

module.exports = PagedContentModel;
