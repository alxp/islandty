require('dotenv').config();
const fs = require("fs");
const islandtyHelpers = require('../../_data/islandtyHelpers.js');
const readCSV = require('../../_data/readCSV.js');
const slugify = require('slugify');
const yaml = require('js-yaml');

/**
 * Write a dictionary to a YAML file at the specified location.

 *
 * @param {*} data
 *   The data to be written.
 * @param string dir
 *   The location of the file. WIll be created if it doesn't exist.
 * @param {*} fileName
 *   The filename to be created. Extension is not assumed.
 */
function writePageTemplate(data, dir, fileName) {
  const yamlString = yaml.dump(data); // Convert object to YAML string

  const content = `---\n${yamlString}---\n`; // Add dashes at the end
  // If contentPath does not exist, make it.

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  fs.writeFile(path.join(dir, fileName), content, (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Islandty wrote ' + fileName);
    }
  });
}

var path = require('path');
// Run me before the build start
console.log("Reading input CSV and generating template files for each repository object.");

items = readCSV().items;

const inputMediaPath = process.env.inputMediaPath;
console.log('Using input media path: ' + inputMediaPath);
const outputDir = "src/" + process.env.contentPath;
console.log('Using output staging path: ' + outputDir);
const linkedAgentDir = "src/" + process.env.linkedAgentPath;
console.log('Using Linked Agent staging path: ' + linkedAgentDir);


var allLinkedAgents = {};

for (const [key, item] of Object.entries(items)) {

  var contentModelName = item.field_model.replace(/\s+/g, '');

  var contentModel;
  try {
    contentModel = require('../../islandty/ContentModels/' + contentModelName);
  }
  catch (e) {

    if (e.code != 'MODULE_NOT_FOUND') {
      console.log(e);
    }
    else {

    }
    contentModelName = 'default';
    contentModel = require('../../islandty/ContentModels/' + contentModelName)
  }
  contentModel.updateFilePaths(item);

  var transformedItem = islandtyHelpers.transformKeys(item)

  if ('field_linked_agent' in transformedItem) {
    for (const [linkedAgentType, linkedAgents] of Object.entries(transformedItem['field_linked_agent'])) {
      if (!(linkedAgentType in allLinkedAgents)) {
        allLinkedAgents[linkedAgentType] = {};
      }
      for (const [linkedAgentName, linkedAgentValues] of Object.entries(linkedAgents)) {
        for (const linkedAgentValue of linkedAgentValues) {
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

  writePageTemplate(transformedItem, "./src/islandty/staging/object", item.id + '.md');
}

fs.mkdirSync(linkedAgentDir, { recursive: true });

const linkedAgentsData = {
  pagination: {
    data: 'collections.linkedAgent',
    size: 1,
    alias: 'relator'
  },
  layout: 'layouts/linked-agent-type.html',
  permalink: '/linked-agent/{{ relator.slug }}/index.html'
};

writePageTemplate(linkedAgentsData, './src/islandty/staging/linked-agent', 'linked-agent.md');
for (const [linkedAgentDatabaseName, linkedAgentTypes] of Object.entries(allLinkedAgents)) {
  fs.writeFile(path.join(linkedAgentDir, linkedAgentDatabaseName + '.json'), JSON.stringify(linkedAgentTypes, null, 2),
    (err) => console.log(err));

  // Create the Linked Agent collection data template.
  const linkedAgentNamespacePageData = {
    pagination: {
      data: "collections.linkedAgent_" + linkedAgentDatabaseName,
      size: 1,
      alias: "relator",
    },
    layout: "layouts/linked-agent-type.html",
    linkedAgentNamespace: linkedAgentDatabaseName,
    permalink: "/" + process.env.linkedAgentPath + "/" + linkedAgentDatabaseName + "/{{ relator.slug }}/index.html"
  };
  writePageTemplate(linkedAgentNamespacePageData, './src/islandty/staging/linked-agent', linkedAgentDatabaseName + '.md');
  // Create templates for each linked agent type, e.g., 'Author', 'Editor'.
  for (linkedAgentTypeName of Object.keys(linkedAgentTypes)) {
    linkedAgentData = {
      pagination: {
        data: "collections.linkedAgent_" + linkedAgentDatabaseName + "_" + islandtyHelpers.strToSlug(linkedAgentTypeName),
        size: 1,
        alias: "relator",

      },
      layout: "layouts/linked-agent.html",
      linkedAgentNamespace: linkedAgentDatabaseName,
      permalink: "/" + process.env.linkedAgentPath + "/" + linkedAgentDatabaseName + "/" + islandtyHelpers.strToSlug(linkedAgentTypeName) + "/{{ relator.slug }}/index.html"
    };
    const linkedAgentPath = path.join(linkedAgentDir, linkedAgentDatabaseName);
    const outputFile = islandtyHelpers.strToSlug(linkedAgentTypeName) + ".md";
    writePageTemplate(linkedAgentData, linkedAgentPath, outputFile);

  }
}
