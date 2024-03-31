
const parse = require('csv-parse/sync');
require('dotenv').config();
const fs = require("fs");

function readCSV() {
  let csv = fs.readFileSync(process.env.dataFileName, { encoding: 'utf8', });

  let data = parse.parse(csv, { columns: true, skip_empty_lines: true });

  return data;
}

module.exports = function () {
  const data = readCSV();
  return { items: data };
};
