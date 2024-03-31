
const parse = require('csv-parse/sync');

const fs = require("fs");

function readCSV() {
  let csv = fs.readFileSync('./src/_data/demo_objects.csv', { encoding: 'utf8', });

  let data = parse.parse(csv, { columns: true, skip_empty_lines: true });

  return data;
}

module.exports = function () {
  const data = readCSV();
  return { items: data };
};
