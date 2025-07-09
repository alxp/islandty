const fs = require('fs').promises;
const path = require('path');
const { strToSlug, strToSlugWithCounter } = require('../_data/islandtyHelpers');
const yaml = require('js-yaml');

// Initialize linked agent data structure
function initLinkedAgentsData() {
  return {};
}

// Process a single item for linked agents
function processItemForLinkedAgents(item, linkedAgentsData) {
  if (item.field_linked_agent) {
    for (const [linkedAgentType, linkedAgents] of Object.entries(item.field_linked_agent)) {
      if (!linkedAgentsData[linkedAgentType]) {
        linkedAgentsData[linkedAgentType] = {};
      }

      for (const [linkedAgentName, linkedAgentValues] of Object.entries(linkedAgents)) {
        for (const linkedAgentValue of linkedAgentValues) {
          if (!linkedAgentsData[linkedAgentType][linkedAgentName]) {
            linkedAgentsData[linkedAgentType][linkedAgentName] = {};
          }

          if (!linkedAgentsData[linkedAgentType][linkedAgentName][linkedAgentValue]) {
            linkedAgentsData[linkedAgentType][linkedAgentName][linkedAgentValue] = {
              nameSlug: strToSlugWithCounter(linkedAgentValue),
              values: []
            };
          }

          linkedAgentsData[linkedAgentType][linkedAgentName][linkedAgentValue]['values'].push(item.id);
        }
      }
    }
  }
  return linkedAgentsData;
}

// Write linked agent files to staging directory
async function writeLinkedAgentFiles(linkedAgentsData, linkedAgentDir, linkedAgentPath) {
  // Create main linked agent directory
  await fs.mkdir(linkedAgentDir, { recursive: true });

  // Write main linked agent file
  const linkedAgentsDataForMain = {
    pagination: {
      data: 'collections.linkedAgent',
      size: 1,
      alias: 'relator'
    },
    layout: 'layouts/linked-agent-type.html',
    permalink: `/${linkedAgentPath}/{{ relator.slug }}/index.html`
  };
  await writePageTemplate(linkedAgentsDataForMain, linkedAgentDir, 'linked-agent.md');

  // Process each linked agent namespace
  for (const [linkedAgentNamespace, linkedAgentTypes] of Object.entries(linkedAgentsData)) {
    // Write JSON file
    const agentFilePath = path.join(linkedAgentDir, `${linkedAgentNamespace}.json`);
    await fs.writeFile(agentFilePath, JSON.stringify(linkedAgentTypes, null, 2));

    // Create namespace page data
    const linkedAgentNamespacePageData = {
      pagination: {
        data: `collections.linkedAgent_${linkedAgentNamespace}`,
        size: 1,
        alias: "relator",
      },
      layout: "layouts/linked-agent-type.html",
      linkedAgentNamespace: linkedAgentNamespace,
      permalink: `/${linkedAgentPath}/${linkedAgentNamespace}/{{ relator.slug }}/index.html`
    };
    await writePageTemplate(
      linkedAgentNamespacePageData,
      linkedAgentDir,
      `${linkedAgentNamespace}.md`
    );

    // Create templates for each linked agent type
    for (const linkedAgentTypeName of Object.keys(linkedAgentTypes)) {
      const linkedAgentData = {
        pagination: {
          data: `collections.linkedAgent_${linkedAgentNamespace}_${strToSlug(linkedAgentTypeName)}`,
          size: 1,
          alias: "relator",
        },
        layout: "layouts/linked-agent.html",
        linkedAgentNamespace: linkedAgentNamespace,
        permalink: `/${linkedAgentPath}/${linkedAgentNamespace}/${strToSlug(linkedAgentTypeName)}/{{ relator.slug }}/index.html`
      };

      const linkedAgentTypeDir = path.join(linkedAgentDir, linkedAgentNamespace);
      const outputFile = `${strToSlug(linkedAgentTypeName)}.md`;

      await writePageTemplate(
        linkedAgentData,
        linkedAgentTypeDir,
        outputFile
      );
    }
  }
}

// Helper function to write page templates
async function writePageTemplate(data, dir, fileName) {
  const yamlString = yaml.dump(data);
  const content = `---\n${yamlString}---\n`;

  try {
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, fileName);
    await fs.writeFile(filePath, content);
  } catch (err) {
    throw new Error(`Error writing template: ${err}`);
  }
}

// Configure Eleventy collections for linked agents
function configureLinkedAgentCollections(eleventyConfig, linkedAgentDir, linkedAgentPath) {
  const glob = require('glob');
  const path = require('path');
  const fs = require('fs');
  const { strToSlug, getNested } = require('../_data/islandtyHelpers');

  const linkedAgentDatabases = glob.sync(path.join(linkedAgentDir, "*.json"));
  let linkedAgentNamespaces = [];

  for (const linkedAgentDatabasePath of linkedAgentDatabases) {
    const linkedAgentDatabaseName = path.parse(linkedAgentDatabasePath).name;
    linkedAgentNamespaces.push(linkedAgentDatabaseName);

    const rawData = fs.readFileSync(linkedAgentDatabasePath, 'utf8');
    const linkedAgentDatabase = JSON.parse(rawData);
    const linkedAgentTypeNames = Object.keys(linkedAgentDatabase);

    eleventyConfig.addCollection("linkedAgent_" + linkedAgentDatabaseName, function (collection) {
      return linkedAgentTypeNames.sort(function (a, b) {
        return a.localeCompare(b, "en", { sensitivity: "base" });
      })
        .map((linkedAgentTypeName) => ({
          title: linkedAgentTypeName,
          slug: strToSlug(linkedAgentTypeName),
          link: "/" + linkedAgentPath + "/" + strToSlug(linkedAgentDatabaseName) + "/" + strToSlug(linkedAgentTypeName) + "/index.html",
          collectionName: "linkedAgent_" + strToSlug(linkedAgentDatabaseName + "_" + strToSlug(linkedAgentTypeName))
        }));
    });

    for (const linkedAgentTypeName of linkedAgentTypeNames) {
      const linkedAgentTypeSlug = strToSlug(linkedAgentTypeName);
      eleventyConfig.addCollection("linkedAgent_" + linkedAgentDatabaseName + "_" + linkedAgentTypeSlug, function (collection) {
        let linkedAgentNames = Object.keys(linkedAgentDatabase[linkedAgentTypeName])
          .map((name) => {
            const nameSlug = linkedAgentDatabase[linkedAgentTypeName][name]['nameSlug'];
            return {
              title: name,
              linkedAgentNamespace: linkedAgentDatabaseName,
              linkedAgentType: linkedAgentTypeName,
              linkedAgentTypeSlug: linkedAgentTypeSlug,
              link: "/" + linkedAgentPath + "/" + strToSlug(linkedAgentDatabaseName) + "/" + linkedAgentTypeSlug + "/" + nameSlug + "/index.html",
              slug: nameSlug
            };
          })
          .sort(function (a, b) {
            return a.title.localeCompare(b.title, "en", { sensitivity: "base" });
          });
        return linkedAgentNames;
      });

      for (const linkedAgentName of Object.keys(linkedAgentDatabase[linkedAgentTypeName])) {
        const linkedAgent = linkedAgentDatabase[linkedAgentTypeName][linkedAgentName];
        const linkedAgentNameSlug = linkedAgent.nameSlug;
        eleventyConfig.addCollection("linkedAgent_" + linkedAgentDatabaseName + "_" + linkedAgentTypeSlug + "_" + linkedAgentNameSlug, function (collection) {
          const linkedAgentCollection = collection.getAll().filter(function (item) {
            const target = getNested(item, 'data', 'field_linked_agent', linkedAgentDatabaseName, linkedAgentTypeName);
            if (target) {
              return target.includes(linkedAgentName);
            }
            return false;
          })
            .sort(function (a, b) {
              return a.data.title.localeCompare(b.data.title, "en", { sensitivity: "base" });
            });
          return linkedAgentCollection;
        });
      }
    }
  }

  eleventyConfig.addCollection("linkedAgent", function (collection) {
    return linkedAgentNamespaces.map((linkedAgentNamespace) => ({
      title: linkedAgentNamespace,
      link: "/" + linkedAgentPath + "/" + strToSlug(linkedAgentNamespace) + "/index.html",
      slug: strToSlug(linkedAgentNamespace),
      collectionName: "linkedAgent_" + strToSlug(linkedAgentNamespace),
      permalinkBase: path.join(linkedAgentPath, strToSlug(linkedAgentNamespace))
    }));
  });
}

module.exports = {
  initLinkedAgentsData,
  processItemForLinkedAgents,
  writeLinkedAgentFiles,
  configureLinkedAgentCollections
};
