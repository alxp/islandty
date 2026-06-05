import { isTest } from '../../testUtils.js';
import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'test') {
  dotenv.config();
}
import * as linkedAgentHelper from '../linkedAgentHelper.js';
import { writeFileSync } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { getMergedFieldConfig } from '../../_data/fieldConfigHelper.js';
import * as islandtyHelpers from '../../_data/islandtyHelpers.js';
import readCSV from '../../_data/readCSV.js';
import slugify from 'slugify';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

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

const REQUIRED_ENV_VARS = ['inputMediaPath', 'contentPath', 'outputDir', 'linkedAgentPath'];

async function main() {
  console.log("Reading input CSV and generating template files for each repository object.");

  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(`Missing required environment variable(s): ${missing.join(', ')}`);
    console.error('Check your .env file and ensure these values are set.');
    process.exit(1);
  }

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



    const allLinkedAgents = linkedAgentHelper.initLinkedAgentsData();

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
        const mod = await import(`../../islandty/ContentModels/${contentModelName}.js`);
        ContentModelClass = mod.default;
      } catch (e) {
        if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
        const mod = await import(`../../islandty/ContentModels/default.js`);
        ContentModelClass = mod.default;
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


      const transformedItem = islandtyHelpers.transformKeys(item, fieldInfo);

      // Process linked agents for this item
      linkedAgentHelper.processItemForLinkedAgents(transformedItem, allLinkedAgents);

      // Write page template
      transformedItem.layout = 'layouts/content-item.html';
      await writePageTemplate(transformedItem, objectStagingDir, `${item.id}.md`);


    }

    // Write linked agent files
    await linkedAgentHelper.writeLinkedAgentFiles(
      allLinkedAgents,
      linkedAgentDir,
      process.env.linkedAgentPath
    );

  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

export { main };

// When the command is run directly.
const runDirectly = process.argv[1] === __filename;
if (runDirectly) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
