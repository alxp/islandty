const { build: buildIiif } = require('biiif');
const { promises: fs } = require('fs');
const path = require('path');
const defaultContentModel = require('./default.js');
const { getChildContent, generateIiifMetadata } = require('../../_data/islandtyHelpers.js');
const readCSV = require('../../_data/readCSV.js');
require('dotenv').config();

module.exports = {
  async ingest(item, inputMediaPath, outputDir) {
    console.log("Processing paged content model ingest");

    try {
      const { items: allItems } = await readCSV();
      const pages = getChildContent(allItems, item.id);

      if (pages.length > 0) {
        // Process pages sequentially to maintain order
        for (const page of pages) {
          const inputFile = path.join(inputMediaPath, page.file);
          const fileName = path.basename(inputFile);
          const baseName = fileName.replace(/\.[^/.]+$/, "");
          const outputPath = path.join(outputDir, 'iiif', `_${baseName}`);

          // Create directory if needed
          await fs.mkdir(outputPath, { recursive: true });

          // Copy main file
          const destFile = path.join(outputPath, fileName);
          await fs.copyFile(inputFile, destFile);
          console.log(`Copied ${destFile}`);

          // Handle hOCR files
          let hocrFile = page.hocr;
          if (!hocrFile) {
            // Check for implicit hOCR file
            const potentialHocrFile = path.join(
              path.dirname(inputFile),
              `${baseName}.hocr`
            );
            try {
              await fs.access(potentialHocrFile);
              hocrFile = potentialHocrFile;
              page.hocr = hocrFile;
              console.log(`Found hOCR file ${potentialHocrFile}`);
            } catch {
              // File doesn't exist, continue
            }
          }

          if (hocrFile) {
            const hocrFileName = path.basename(hocrFile);
            const hocrDest = path.join(outputPath, hocrFileName);
            await fs.copyFile(hocrFile, hocrDest);
            console.log(`Copied hOCR file ${hocrDest}`);
          }
        }

        // Generate IIIF manifest and tiles
        const iiifPath = path.join(outputDir, 'iiif');
        generateIiifMetadata(item, iiifPath);

        const prefix = process.env.pathPrefix || '/';
        const iiifOptions = new URL(
            path.join(prefix, process.env.contentPath, item.id, 'iiif'),
            process.env.serverHost
          ).toString()
        ;

        // Wrap BIIIF build in promise
        await new Promise((resolve, reject) => {
          buildIiif(iiifPath, iiifOptions)
            .then(resolve)
            .catch(reject);
        });
      }

      // Process default ingestion
      await defaultContentModel.ingest(item, inputMediaPath, outputDir);

    } catch (err) {
      throw new Error(`Paged content ingestion failed: ${err.message}`);
    }
  },

  async updateFilePaths(item) {
    defaultContentModel.updateFilePaths(item);
  }
};
