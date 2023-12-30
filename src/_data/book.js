
const parse = require('csv-parse/sync');

const fs = require("fs");

function readCSV() {

  //const input = fs.readFileSync("./src/_data/values.csv");
  let csv = fs.readFileSync('./src/_data/largebook.csv', {encoding:'utf8',});
let data = parse.parse(csv, { columns:true, skip_empty_lines:true });
return data;
}

module.exports = function () {
  const data = readCSV();
  return {items: data};
};
