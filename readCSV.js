require('dotenv').config();
const fs = require("fs");
const islandoraHelpers = require('./src/_data/islandoraHelpers.js');
const readCSV = require('./src/_data/readCSV.js');
const slugify = require('slugify');
const yaml = require('js-yaml');

var path = require('path');
// Run me before the build start
console.log("Reading input CSV and generating template files for each repository object.");

items = readCSV().items;

const inputMediaPath = process.env.inputMediaPath;
console.log('Using input media path: ' + inputMediaPath);
const outputDir = "src/" + process.env.contentPath;
console.log('Using output path: ' + outputDir);


for (const [key, item] of Object.entries(items)) {

  var contentModelName = item.field_model.replace(/\s+/g, '');

        var contentModel;
        try {
          contentModel = require('./src/islandty/ContentModels/' + contentModelName);
        }
        catch (e) {

          if (e.code != 'MODULE_NOT_FOUND') {
            console.log(e);
          }
          else {
            console.log(`No content model found for $(contentModelName). Using default.`)
          }
          contentModelName = 'default';
          contentModel = require('./src/islandty/ContentModels/' + contentModelName)
        }
contentModel.updateFilePaths(item);

var transformedItem = islandoraHelpers.transformKeys(item)
  transformedItem.layout = 'layouts/content-item.html';

  const yamlString = yaml.dump(transformedItem); // Convert object to YAML string

  const content = `---\n${yamlString}---\n`; // Add dashes at the end
  // If contentPath does not exist, make it.
  if (!fs.existsSync("src/" + process.env.contentPath)) {
    fs.mkdirSync(outputDirh);
  }
  const outputFile = outputDir + '/' + item.id + '.md';
  fs.writeFile(outputFile, content, (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Wrote ' + outputFile);
    }
  });
}
