const csv = require('csv');
const fs = require('fs');
const axios = require('axios');
const { PassThrough } = require('stream');

function transformGoogleSheetsUrl(url, sheetName) {
  const googleSheetsRegex = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
  const match = url.match(googleSheetsRegex);
  if (!match) return url;

  const key = match[1];
  let csvUrl = `https://docs.google.com/spreadsheets/d/${key}/gviz/tq?tqx=out:csv`;
  if (sheetName) csvUrl += `&sheet=${encodeURIComponent(sheetName)}`;
  return csvUrl;
}

module.exports = function readCSVCore() {
  return new Promise((resolve, reject) => {
    let isAlternateFormat = false;
    let headerSkipped = false;
    let rowsToSkip = 0;
    let columnToIgnore = 0;
    let headers = [];
    let fieldLabels = {};
    let fieldCardinality = {};

    const parser = csv.parse({
      skip_empty_lines: true,
      on_record: (record, context) => {
        if (!headerSkipped && record[0] === 'REMOVE THIS COLUMN (KEEP THIS ROW)') {
          isAlternateFormat = true;
          columnToIgnore = 1;
          rowsToSkip = 2;
        }

        if (isAlternateFormat && !headerSkipped && headers.length === 0) {
          headers = record.slice(columnToIgnore);
          headerSkipped = true;
          return null;
        }

        if (!isAlternateFormat && !headerSkipped && headers.length === 0) {
          headers = record;
          headerSkipped = true;
          return null;
        }

        if (isAlternateFormat && headerSkipped && rowsToSkip === 2) {
          record.slice(columnToIgnore).forEach((label, i) => {
            if (i < headers.length) fieldLabels[headers[i]] = label;
          });
          rowsToSkip--;
          return null;
        }

        if (isAlternateFormat && headerSkipped && rowsToSkip === 1) {
          record.slice(columnToIgnore).forEach((cardinality, i) => {
            if (i < headers.length) {
              fieldCardinality[headers[i]] = cardinality === 'unlimited' ? '-1' : cardinality;
            }
          });
          rowsToSkip--;
          return null;
        }

        if (isAlternateFormat && rowsToSkip > 0) {
          rowsToSkip--;
          return null;
        }

        if (isAlternateFormat && columnToIgnore > 0) {
          return record.slice(columnToIgnore);
        }

        return record;
      }
    });

    const records = [];
    let dataSource = process.env.dataFileName;

    const processData = (stream) => {
      stream
        .pipe(parser)
        .on('data', (record) => {
          if (record && headerSkipped) {
            const obj = {};
            headers.forEach((header, i) => {
              if (i < record.length) obj[header] = record[i];
            });
            records.push(obj);
          }
        })
        .on('end', () => {
          resolve({
            items: records,
            fieldInfo: { labels: fieldLabels, cardinality: fieldCardinality }
          });
        })
        .on('error', reject);
    };

    if (dataSource.startsWith('http://') || dataSource.startsWith('https://')) {
      dataSource = transformGoogleSheetsUrl(dataSource, process.env.googleSheetName);
      axios({ method: 'get', url: dataSource, responseType: 'stream' })
        .then(response => processData(response.data))
        .catch(reject);
    } else {
      processData(fs.createReadStream(dataSource));
    }
  });
};
