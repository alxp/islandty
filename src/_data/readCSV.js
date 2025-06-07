const csv = require('csv');
const fs = require('fs');
const axios = require('axios');
const { PassThrough } = require('stream');
const islandtyHelpers = require('./islandtyHelpers.js');
const process = require('process');

function readCSV() {
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

        // Validate that CSV file has required columns.
        let mandatory_csv_columns = ['id', 'title', 'file', 'field_model']
        function validateHeaders(headers) {
          mandatory_csv_columns.forEach(function(item) {
            if (!headers.includes(item)) {
              console.log(`ERROR: Mandatory column "${item}" is missing from the input spreadsheet.`)
              process.exit(1);
            }
          });
        }

        // Detect if this is the alternate format (first column contains "REMOVE THIS COLUMN")
        if (!headerSkipped && record[0] === 'REMOVE THIS COLUMN (KEEP THIS ROW)') {
          isAlternateFormat = true;
          columnToIgnore = 1; // Ignore first column
          rowsToSkip = 2; // Skip 2 extra rows after header
        }

        // For the header row in alternate format, remove first column
        if (isAlternateFormat && !headerSkipped && headers.length === 0) {
          headers = record.slice(columnToIgnore);
          validateHeaders(headers);
          headerSkipped = true;
          return null; // Skip this record
        }

        if (!isAlternateFormat && !headerSkipped && headers.length === 0) {
          headers = record;
          validateHeaders(headers);
          headerSkipped = true;
          return null; // Skip this record
        }

        // Get field labels (first row after header in alternate format)
        if (isAlternateFormat && headerSkipped && rowsToSkip === 2) {
          record.slice(columnToIgnore).forEach((label, i) => {
            if (i < headers.length) {
              fieldLabels[headers[i]] = label;
            }
          });
          rowsToSkip--;
          return null;
        }

        // Get field cardinality (second row after header in alternate format)
        if (isAlternateFormat && headerSkipped && rowsToSkip === 1) {
          record.slice(columnToIgnore).forEach((cardinality, i) => {
            if (i < headers.length) {
              fieldCardinality[headers[i]] = cardinality === 'unlimited' ? '-1' : cardinality;
            }
          });
          rowsToSkip--;
          return null;
        }

        // Skip extra rows in alternate format
        if (isAlternateFormat && rowsToSkip > 0) {
          rowsToSkip--;
          return null;
        }

        // For all data rows, remove first column if alternate format
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
          // Validate that record has mandatory values.
          let mandatory_record_values = ['id', 'title']
          function validateRecord(record) {
            mandatory_record_values.forEach(function (field) {
              if (!record[field]) {
                console.log(`ERROR: record is missing mandatory field ${field}.`)
                console.log(JSON.stringify(record));
                process.exit(1);
              }
            })
          }
          // Only push data records (skip header and skipped rows)
          if (record && headerSkipped) {
            // Convert array to object using headers
            const obj = {};
            headers.forEach((header, i) => {
              // Skip if we've run out of values in this record
              if (i < record.length) {
                obj[header] = record[i];
              }
            });
            validateRecord(obj);
            records.push(obj);
          }
        })
        .on('end', () => {
          resolve({
            items: records,
            fieldInfo: {
              labels: fieldLabels,
              cardinality: fieldCardinality
            }
          });
        })
        .on('error', (err) => reject(err));
    };

    // Check if the dataSource is a URL
    if (dataSource.startsWith('http://') || dataSource.startsWith('https://')) {
      dataSource = transformGoogleSheetsUrl(dataSource, process.env.googleSheetName);

      // Use axios to download the file from the URL
      axios({
        method: 'get',
        url: dataSource,
        responseType: 'stream'
      })
        .then((response) => {
          processData(response.data);
        })
        .catch((err) => reject(err));
    } else {
      // Use createReadStream for local files
      processData(fs.createReadStream(dataSource));
    }
  });
}

function transformGoogleSheetsUrl(url, sheetName) {
  // Check if the URL is a Google Sheets URL
  const googleSheetsRegex = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
  const match = url.match(googleSheetsRegex);

  if (!match) {
    // If it's not a Google Sheets URL, return the original URL
    return url;
  }

  // Extract the key (document identifier) from the URL
  const key = match[1];

  // Construct the base CSV download URL
  let csvUrl = `https://docs.google.com/spreadsheets/d/${key}/gviz/tq?tqx=out:csv`;

  // Append the sheet name if provided
  if (sheetName) {
    csvUrl += `&sheet=${encodeURIComponent(sheetName)}`;
  }

  return csvUrl;
}

module.exports = async function () {
  try {
    let { items, fieldInfo } = await readCSV();

    return {
      items: items,
      fieldInfo: fieldInfo
    };
  } catch (err) {
    console.error('CSV processing error:', err);
    throw err;
  }
};
