const { isTest } = require('../../testUtils');
if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config();
}
const {writeFileSync } = require('fs');
const { promises: fs } = require("fs");
const path = require('path');
const { getMergedFieldConfig } = require('../../_data/fieldConfigHelper.js');
const islandtyHelpers = require('../../_data/islandtyHelpers.js');
const readCSV = require('../../_data/readCSV.js');
const slugify = require('slugify');
const yaml = require('js-yaml');

async function writePageTemplate(data, dir, fileName) {
  const yamlString = yaml.dump(data);
  const content = `---\n${yamlString}---\n`;

  try {
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, fileName);
    await fs.writeFile(filePath, content);
    console.log('Islandty wrote ' + fileName);

  } catch (err) {
    console.error('Error writing template:', err);
    throw err;
  }
}

async function main() {
  console.log("Reading input CSV and generating template files for each repository object.");


  try {
    // Generate and save merged field config
    const fieldInfo = await getMergedFieldConfig();
    writeFileSync('./config/mergedIslandtyFieldInfo.json', JSON.stringify(fieldInfo));


    const rawItems = await readCSV();
    const items = islandtyHelpers.cleanInputData(rawItems.items);
    const inputMediaPath = process.env.inputMediaPath;
    const outputDir = path.join("src", process.env.contentPath);
    const stagingDir = process.env.stagingDir || "src/islandty/staging";
    const objectStagingDir = path.join(stagingDir, process.env.objectStagingPath || "object");
    const linkedAgentDir = path.join(stagingDir, process.env.linkedAgentStagingPath || "linked-agent");

    console.log('Using input media path:', inputMediaPath);

    console.log('Using Linked Agent staging path:', linkedAgentDir);



    const allLinkedAgents = {};

    // Process all items
    for (const item of Object.values(items)) {

      if (!item.id && item.node_id) {
        item.id = item.node_id;
      }
      let contentModelName;
      let ContentModelClass;

      if ('field_model' in item) {
        contentModelName = item.field_model.split(':').pop().replace(/\s+/g, '');
      }

      try {
        // Use different path resolution in test environment
        //if (isTest()) {
//          ContentModelClass = require(`../../src/islandty/ContentModels/${contentModelName}`);
        //} else {
          ContentModelClass = require(`../../islandty/ContentModels/${contentModelName}`);
        //}
      } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') throw e;
        //if (isTest()) {
//          ContentModelClass = require(`../../src/islandty/ContentModels/default`);
        //} else {
          ContentModelClass = require(`../../islandty/ContentModels/default`);
        //}
      }

      const contentModel = new ContentModelClass();
      await contentModel.init();

      // Process files using content model
      const objectOutputDir = path.join(process.env.outputDir, process.env.contentPath, item.id);
      console.log(`Processing item ${item.id}`);

      if ('file' in item) {
        console.log(`Source file: ${path.join(inputMediaPath, item.file)}`);
      }

      await contentModel.ingest(item, inputMediaPath, objectOutputDir);
      await contentModel.updateFilePaths(item);

      const transformedItem = islandtyHelpers.transformKeys(item, fieldInfo);

      // Process linked agents
      if (transformedItem.field_linked_agent) {
        for (const [linkedAgentType, linkedAgents] of Object.entries(transformedItem.field_linked_agent)) {
          if (!allLinkedAgents[linkedAgentType]) {
            allLinkedAgents[linkedAgentType] = {};
          }

          for (const [linkedAgentName, linkedAgentValues] of Object.entries(linkedAgents)) {
            for (const linkedAgentValue of linkedAgentValues) {
              if (!allLinkedAgents[linkedAgentType][linkedAgentName]) {
                allLinkedAgents[linkedAgentType][linkedAgentName] = {};
              }

              if (!allLinkedAgents[linkedAgentType][linkedAgentName][linkedAgentValue]) {
                allLinkedAgents[linkedAgentType][linkedAgentName][linkedAgentValue] = {
                  nameSlug: islandtyHelpers.strToSlugWithCounter(linkedAgentValue),
                  values: []
                };
              }

              allLinkedAgents[linkedAgentType][linkedAgentName][linkedAgentValue]['values'].push(transformedItem.id);
            }
          }
        }
      }

      // Write page template
      transformedItem.layout = 'layouts/content-item.html';
      await writePageTemplate(transformedItem, objectStagingDir, `${item.id}.md`);


    }

    // Create linked agent directory structure
    await fs.mkdir(linkedAgentDir, { recursive: true });

    // Write main linked agent file
    const linkedAgentsData = {
      pagination: {
        data: 'collections.linkedAgent',
        size: 1,
        alias: 'relator'
      },
      layout: 'layouts/linked-agent-type.html',
      permalink: '/linked-agent/{{ relator.slug }}/index.html'
    };
    await writePageTemplate(linkedAgentsData, linkedAgentDir, 'linked-agent.md');

    // Process all linked agent types
    for (const [linkedAgentDatabaseName, linkedAgentTypes] of Object.entries(allLinkedAgents)) {
      // Write JSON file
      const agentFilePath = path.join(linkedAgentDir, `${linkedAgentDatabaseName}.json`);
      await fs.writeFile(agentFilePath, JSON.stringify(linkedAgentTypes, null, 2));

      // Create namespace page data
      const linkedAgentNamespacePageData = {
        pagination: {
          data: `collections.linkedAgent_${linkedAgentDatabaseName}`,
          size: 1,
          alias: "relator",
        },
        layout: "layouts/linked-agent-type.html",
        linkedAgentNamespace: linkedAgentDatabaseName,
        permalink: `/${process.env.linkedAgentPath}/${linkedAgentDatabaseName}/{{ relator.slug }}/index.html`
      };
      await writePageTemplate(
        linkedAgentNamespacePageData,
        linkedAgentDir,
        `${linkedAgentDatabaseName}.md`
      );

      // Create templates for each linked agent type
      for (const linkedAgentTypeName of Object.keys(linkedAgentTypes)) {
        const linkedAgentData = {
          pagination: {
            data: `collections.linkedAgent_${linkedAgentDatabaseName}_${islandtyHelpers.strToSlug(linkedAgentTypeName)
              }`,
            size: 1,
            alias: "relator",
          },
          layout: "layouts/linked-agent.html",
          linkedAgentNamespace: linkedAgentDatabaseName,
          permalink: `/${process.env.linkedAgentPath}/${linkedAgentDatabaseName}/${islandtyHelpers.strToSlug(linkedAgentTypeName)
            }/{{ relator.slug }}/index.html`
        };

        const linkedAgentPath = path.join(linkedAgentDir, linkedAgentDatabaseName);
        const outputFile = `${islandtyHelpers.strToSlug(linkedAgentTypeName)}.md`;

        await writePageTemplate(
          linkedAgentData,
          linkedAgentPath,
          outputFile
        );
      }
    }

  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// Export the main function for calling by tests.
module.exports = {
  main
};

// When the command is run directly.
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
