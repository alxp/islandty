
const parse = require('csv-parse/sync');

const fs = require("fs");

function readCSV() {



  let fieldscsv = fs.readFileSync('./src/_data/islandoraFieldNames.csv', {encoding:'utf8',});
  var data = {};
  let fieldNames = parse.parse(fieldscsv, { columns:false, skip_empty_lines:true });
  fieldNames.forEach(element => {
    data[element[0]] = element[1];
});

return data;
}

module.exports = function () {
  const data = readCSV();
  return {items: data};
};
