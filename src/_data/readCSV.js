const csv = require('csv');
const fs = require('fs');
const axios = require('axios');
const { PassThrough } = require('stream');

function readCSV() {
  return new Promise((resolve, reject) => {
    const parser = csv.parse({
      columns: true,
      skip_empty_lines: true
    });

    const records = [];

    let dataSource = process.env.dataFileName;

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
          // Pipe the response stream to the CSV parser
          response.data
            .pipe(parser)
            .on('data', (record) => records.push(record))
            .on('end', () => resolve(records))
            .on('error', (err) => reject(err));
        })
        .catch((err) => reject(err));
    } else {
      // Use createReadStream for local files
      fs.createReadStream(dataSource)
        .pipe(parser)
        .on('data', (record) => records.push(record))
        .on('end', () => resolve(records))
        .on('error', (err) => reject(err));
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
    const data = await readCSV();
    return { items: data };
  } catch (err) {
    console.error('CSV processing error:', err);
    throw err;
  }
};
