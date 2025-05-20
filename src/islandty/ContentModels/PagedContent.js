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

      // First copy files to OCFL
      const filesMap = super.buildFilesList(item, inputMediaPath, outputDir);
      await this.addPageFiles(filesMap, pages, inputMediaPath);
      await this.storageHandler.copyFiles(filesMap, inputMediaPath, outputDir);

      // Then process IIIF after OCFL commit
      const iiifPath = path.join(
        process.env.outputDir,
        process.env.contentPath,
        item.id,
        'iiif'
      );

      if (pages.length > 0) {
        const needsIIIF = await this.checkIIIFNeeds(item, pages, iiifPath);

        if (needsIIIF) {
          await this.createIIIFStructure(item, pages, inputMediaPath, iiifPath);
          await this.processIIIFDerivatives(item, iiifPath);
          await this.storeIIIFState(item, iiifPath);
        }
      }
    } catch (err) {
      throw new Error(`Paged content ingestion failed: ${err.message}`);
    }
  }

  async addPageFiles(filesMap, pages, inputMediaPath) {
    console.log('Adding page files to OCFL preservation:');

    for (const [index, page] of pages.entries()) {
      if (page.file) {
        const srcPath = path.join(inputMediaPath, page.file);
        const fileName = `pages/${index.toString().padStart(4, '0')}_${path.basename(page.file)}`;

        console.log(`- Preserving ${srcPath} => ${fileName}`);
        filesMap[srcPath] = fileName;
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



  async createIIIFStructure(item, pages, inputMediaPath, iiifPath) {
    // Get actual version from OCFL
    const version = await this.getLatestOcflVersion(item.id);
    const ocflContentPath = path.join(
      process.env.outputDir,
      'ocfl-files',
      item.id,
      version,
      'content'
    );

    // Copy files from OCFL to IIIF directory
    for (const [index, page] of pages.entries()) {
      if (!page.file) continue;

      const baseName = path.basename(page.file, path.extname(page.file));
      const underscoredDir = `_${baseName}`;
      const iiifPageDir = path.join(iiifPath, underscoredDir);

      await fs.mkdir(iiifPageDir, { recursive: true });

      // Construct source path using OCFL-preserved files
      const ocflImagePath = path.join(
        ocflContentPath,
        'pages',
        `${index.toString().padStart(4, '0')}_${path.basename(page.file)}`
      );

      // Verify file exists before copying
      try {
        await fs.access(ocflImagePath);
      } catch {
        throw new Error(`Missing OCFL file: ${ocflImagePath}`);
      }

      const iiifImagePath = path.join(iiifPageDir, path.basename(page.file));
      await fs.copyFile(ocflImagePath, iiifImagePath);

      // Copy hOCR file if exists
      const hocrFile = await this.findHocrFile(page, inputMediaPath);
      if (hocrFile) {
        const hocrFileName = path.basename(hocrFile);
        const ocflHocrPath = path.join(ocflContentPath, `pages/${index.toString().padStart(4, '0')}_${hocrFileName}`);
        const iiifHocrPath = path.join(iiifPageDir, hocrFileName);
        await fs.copyFile(ocflHocrPath, iiifHocrPath);
      }
    }
  }

  async getLatestOcflVersion(objectId) {
    try {
      const object = this.storageHandler.storage.object(objectId);
      const inventory = await object.getInventory();
      return inventory.head;
    } catch (error) {
      return 'v1'; // Fallback for new objects
    }
  }

  async storeIIIFState(item, iiifPath) {
    if (this.storageHandler.isOCFL()) {
      try {
        const version = await this.getLatestOcflVersion(item.id);
        await fs.writeFile(path.join(iiifPath, '.ocfl-version'), version);
      } catch (error) {
        console.error('Error storing IIIF state:', error);
        // Fallback to writing v1 if version can't be determined
        await fs.writeFile(path.join(iiifPath, '.ocfl-version'), 'v1');
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

  async updateFilePaths(item) {
    await super.updateFilePaths(item);

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
  }
}

module.exports = PagedContentModel;
