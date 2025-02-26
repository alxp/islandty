
const parse = require('csv-parse/sync');

const fs = require("fs");

function readCSV() {

  let relatorscsv = fs.readFileSync('./src/_data/islandoraRelators.csv', {encoding:'utf8',});
  var data = {};
  let relators = parse.parse(relatorscsv, { columns:false, skip_empty_lines:true });
  relators.forEach(element => {
    data[element[0]] = element[1];
});

return data;
}

module.exports = function () {
  const data = readCSV();
  return {items: data};
};
