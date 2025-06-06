const { promises: fs } = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const islandtyHelpers = require('../../_data/islandtyHelpers');
const { createStorageHandler } = require('../storageHandler');
require('dotenv');

class DefaultContentModel {
  async init() {
    this.storageHandler = await createStorageHandler(
      process.env.ocfl
    );
    return this;
  }

  async buildMetadataFiles(item) {
    const files = {};
    const dcXml = this.generateDublinCore(item);
    const tempDir = path.join(os.tmpdir(), 'islandty-metadata', uuidv4());

    await fs.mkdir(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, 'dublin_core.xml');
    await fs.writeFile(tempFilePath, dcXml);

    files[tempFilePath] = 'metadata/dublin_core.xml';
    item.metadata_file = 'metadata/dublin_core.xml';

    return files;
  }

  generateDublinCore(item) {
    const metadataFields = islandtyHelpers.getMetadataFields();
    const fieldMap = {
      'dc:title': 'title',
      'dc:description': 'field_description',
      'dc:publisher': 'field_publisher',
      'dc:rights': 'field_rights',
      'dc:identifier': 'field_identifier',
      'dc:type': 'field_resource_type',
      'dc:date': 'field_edtf_date_issued'
    };

    const elements = Object.entries(fieldMap)
      .flatMap(([element, field]) => {
        const value = this.getFieldValue(item, field);
        return this.createDcElements(element, value);
      })
      .concat(this.createSubjectElements(item))
      .join('\n');

    return this.dcWrapper(elements);
  }

  getFieldValue(item, fieldName) {
    const value = item[fieldName] || item.item?.[fieldName];
    if (Array.isArray(value)) return value.filter(v => v);
    return value ? [value] : [];
  }

  createDcElements(element, values) {
    return values
      .filter(v => v && v.trim())
      .map(v => `<${element}>${this.escapeXml(v)}</${element}>`);
  }

  createSubjectElements(item) {
    const subjects = [item.field_subject_general, item.field_subject, item.field_geographic_subject]
      .flat()
      .filter(s => s)
      .map(s => this.escapeXml(s.split(':').slice(1).join(':').trim()));

    return subjects.map(s => `<dc:subject>${s}</dc:subject>`);
  }

  dcWrapper(content) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://purl.org/dc/elements/1.1/ http://dublincore.org/schemas/xmls/qdc/2008/02/11/dc.xsd">
${content}
</metadata>`;
  }

  escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, c => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '\'': '&apos;',
      '"': '&quot;'
    }[c]));
  }



  async ingest(item, inputMediaPath, outputDir) {
    const files = {
      ...this.buildFilesList(item, inputMediaPath, outputDir),
      ...await this.buildMetadataFiles(item)
    };
    await this.storageHandler.copyFiles(files, inputMediaPath, outputDir);
  }

  buildFilesList(item, inputMediaPath, outputDir) {
    const files = {};
    const fileFields = islandtyHelpers.getFileFields();

    fileFields.forEach(field => {
      if (item[field]?.trim()) {
        const srcPath = path.join(inputMediaPath, item[field]);
        const fileName = path.basename(item[field]);
        files[srcPath] = fileName;
      }
    });

    return files;
  }

  async updateFilePaths(item) {
    const fileFields = islandtyHelpers.getFileFields();

    for (const field of fileFields) {
      if (item[field]?.trim()) {
        const fileName = path.basename(item[field]);
        item[field + '_digest'] = await this.storageHandler.calculateFileHash(path.join(process.env.inputMediaPath, item[field]));
        item[field] = await this.storageHandler.getFullContentPath(item, field);
      }
    }

  }
}

module.exports = DefaultContentModel;
