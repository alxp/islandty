const csv = require('csv');
const fs = require('fs');

function readCSV() {
  return new Promise((resolve, reject) => {
    const parser = csv.parse({
      columns: true,
      skip_empty_lines: true
    });

    const records = [];

    // Use createReadStream for better memory handling
    fs.createReadStream(process.env.dataFileName)
      .pipe(parser)
      .on('data', (record) => records.push(record))
      .on('end', () => resolve(records))
      .on('error', (err) => reject(err));
  });
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
