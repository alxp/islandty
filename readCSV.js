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


var allLinkedAgents = {};

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

    }
    contentModelName = 'default';
    contentModel = require('./src/islandty/ContentModels/' + contentModelName)
  }
  contentModel.updateFilePaths(item);

  var transformedItem = islandoraHelpers.transformKeys(item)

  if ('field_linked_agent' in transformedItem) {
    for (const [linkedAgentType, linkedAgents] of Object.entries(transformedItem['field_linked_agent'])) {
      if (!(linkedAgentType in allLinkedAgents)) {
        allLinkedAgents[linkedAgentType] = {};
      }
      for (const [linkedAgentName, linkedAgentValues] of Object.entries(linkedAgents)) {
        for (linkedAgentValue of linkedAgentValues) {
          if (!(linkedAgentName in allLinkedAgents[linkedAgentType])) {
            allLinkedAgents[linkedAgentType][linkedAgentName] = {};
          }
          if (!(linkedAgentValue in allLinkedAgents[linkedAgentType][linkedAgentName])) {
            allLinkedAgents[linkedAgentType][linkedAgentName][linkedAgentValue] = [];
          }
          allLinkedAgents[linkedAgentType][linkedAgentName][linkedAgentValue].push(transformedItem['id']);
        }
      }
    }
  }

  transformedItem.layout = 'layouts/content-item.html';

  const yamlString = yaml.dump(transformedItem); // Convert object to YAML string

  const content = `---\n${yamlString}---\n`; // Add dashes at the end
  // If contentPath does not exist, make it.
  if (!fs.existsSync("src/" + process.env.contentPath)) {
    fs.mkdirSync(outputDir);
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

const linkedAgentDir = path.join(outputDir, 'linked-agents');
fs.mkdirSync(linkedAgentDir, { recursive: true });
for (const [linkedAgentType, linkedAgents] of Object.entries(allLinkedAgents)) {
  fs.writeFile(path.join(linkedAgentDir, linkedAgentType + '.json'), JSON.stringify(linkedAgents, null, 2),
   (err) => console.log(err));


}
