const fs = require('fs');
const rssPlugin = require('@11ty/eleventy-plugin-rss');
const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");
const miradorPlugin = require('eleventy-plugin-mirador');
// Filters
const dateFilter = require('./src/filters/date-filter.js');
const w3DateFilter = require('./src/filters/w3-date-filter.js');
require('dotenv').config();
// Transforms
const htmlMinTransform = require('./src/transforms/html-min-transform.js');

const { itemsWithContentModel, searchIndex } = require('./src/_data/islandtyHelpers.js');
const { getNested, strToSlug } = require('./src/_data/islandtyHelpers.js');

const { execSync } = require('node:child_process');
const { glob } = require('glob')
const path = require('path');
const fieldConfigHelper = require('./src/_data/fieldConfigHelper.js');
const islandtyHelpers = require('./src/_data/islandtyHelpers.js');
const inspect = require("util").inspect;

// Create a helpful production flag
const isProduction = process.env.NODE_ENV == 'production';

module.exports = async config => {

  config.setServerOptions({
    // Default values are shown:

    // Whether the live reload snippet is used
    liveReload: true,

    // Whether DOM diffing updates are applied where possible instead of page reloads
    domDiff: true,

    // The starting port number
    // Will increment up to (configurable) 10 times if a port is already in use.
    port: 8080,

    // Additional files to watch that will trigger server updates
    // Accepts an Array of file paths or globs (passed to `chokidar.watch`).
    // Works great with a separate bundler writing files to your output folder.
    // e.g. `watch: ["_site/**/*.css"]`
    watch: [],

    // Show local network IP addresses for device testing
    showAllHosts: false,

    // Use a local key/certificate to opt-in to local HTTP/2 with https
    https: {
      // key: "./localhost.key",
      // cert: "./localhost.cert",
    },

    // Change the default file encoding for reading/serving files
    encoding: "utf-8",
  });

  // Add filters

  config.addFilter("debug", (content) => `<pre>${inspect(content)}</pre>`);
  config.addFilter('dateFilter', dateFilter);
  config.addFilter('w3DateFilter', w3DateFilter);
  config.addFilter('getGlobalData', (data) => {
    // if your global data lives elsewhere, this file path will need to change a bit
    return require(`./src/_data/${data}.csv`);
  });
  config.addFilter('getLinkFromTitle', (collection, title) => {
    var link = '';
    const filtered = collection.filter(item => item.title == title)
    return filtered[0].link;

  });

  // only minify HTML if we are in productionbecause it slows builds _right_ down
  if (isProduction) {
    config.addTransform('htmlmin', htmlMinTransform);
  }

  // Plugins
  config.addPlugin(EleventyHtmlBasePlugin);

  config.addPlugin(rssPlugin);

  config.addPlugin(miradorPlugin, {
    miradorAppUrl: "/js/mirador.js",
    window: {
      textOverlay: {
        enabled: true,
        selectable: true,
        visible: false
      },
    }
  });

  // Short codes
  config.addShortcode("mediaTrackLabel", async function (type, langCode) {

    const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });
    const langLabel = languageNames.of(langCode);

    return (type + ' ' + langLabel);

  });

  const stagingDir = process.env.stagingDir || "src/islandty/staging";
  const linkedAgentStagingPath = process.env.linkedAgentStagingPath || "linked-agent";
  const linkedAgentDir = path.join(stagingDir, linkedAgentStagingPath);
  const linkedAgentDatabases = glob.sync(path.join(linkedAgentDir, "*.json"));
  var linkedAgentNamespaces = [];
  for (const linkedAgentDatabasePath of linkedAgentDatabases) {
    const linkedAgentDatabaseName = path.parse(linkedAgentDatabasePath).name;
    linkedAgentNamespaces.push(linkedAgentDatabaseName);

    const rawData = fs.readFileSync(linkedAgentDatabasePath, 'utf8');

    const linkedAgentDatabase = JSON.parse(rawData);


    const linkedAgentTypeNames = Object.keys(linkedAgentDatabase);

    config.addCollection("linkedAgent_" + linkedAgentDatabaseName, function (collection) {
      return linkedAgentTypeNames.sort(function (a, b) {
        return a.localeCompare(b, "en", { sensitivity: "base" });
      })
        .map((linkedAgentTypeName) => ({
          title: linkedAgentTypeName,
          slug: strToSlug(linkedAgentTypeName),
          link: "/" + process.env.linkedAgentPath + "/" + strToSlug(linkedAgentDatabaseName + "/" + strToSlug(linkedAgentTypeName)) + "/index.html",
          collectionName: "linkedAgent_" + strToSlug(linkedAgentDatabaseName + "_" + strToSlug(linkedAgentTypeName))
        }));
    });

    // Loop through the linked agent types and create collections of all of its members.
    for (const linkedAgentTypeName of linkedAgentTypeNames) {

      config.addCollection("linkedAgent_" + linkedAgentDatabaseName + "_" + strToSlug(linkedAgentTypeName), function (collection) {
        var linkedAgentNames = Object.keys(linkedAgentDatabase[linkedAgentTypeName])

          .map((name) => {
            nameSlug = linkedAgentDatabase[linkedAgentTypeName][name]['nameSlug'];
            return {
              title: name,
              linkedAgentNamespace: linkedAgentDatabaseName,
              linkedAgentType: linkedAgentTypeName,
              linkedAgentTypeSlug: strToSlug(linkedAgentTypeName),
              link: "/" + process.env.linkedAgentPath + "/" + strToSlug(linkedAgentDatabaseName + "/" + strToSlug(linkedAgentTypeName)) + "/" + nameSlug + "/index.html",
              slug: nameSlug
            }
          })
          .sort(function (a, b) {
            return a['title'].localeCompare(b['title'], "en", { sensitivity: "base" });
          });

        return linkedAgentNames;
      });

      // Create collections for each linked agent.
      for (const linkedAgentName of Object.keys(linkedAgentDatabase[linkedAgentTypeName])) {
        const linkedAgent = linkedAgentDatabase[linkedAgentTypeName][linkedAgentName];
        const linkedAgentNameSlug = linkedAgentDatabase[linkedAgentTypeName][linkedAgentName]['nameSlug']
        config.addCollection("linkedAgent_" + linkedAgentDatabaseName + "_" + strToSlug(linkedAgentTypeName) + "_" + linkedAgentNameSlug, function (collection) {
          const linkedAgentCollection = collection.getAll().filter(function (item) {
            const target = getNested(item, 'data', 'field_linked_agent', linkedAgentDatabaseName, linkedAgentTypeName);
            if (target) {
              return target.includes(linkedAgentName);
            }
            return false;
          })
            .sort(function (a, b) {
              return a['data']['title'].localeCompare(b['data']['title'], "en", { sensitivity: "base" });
            });
          return linkedAgentCollection;
        });

      }
    }
  }

  // Add the top-level Linked Agent collection.
  config.addCollection("linkedAgent", function (collection) {

    var linkedAgentNamespaceCollection = linkedAgentNamespaces.map((linkedAgentNamespace) => ({
      title: linkedAgentNamespace,
      link: "/" + process.env.linkedAgentPath + "/" + strToSlug(linkedAgentNamespace) + "/index.html",
      slug: strToSlug(linkedAgentNamespace),
      collectionName: "linkedAgent_" + strToSlug(linkedAgentNamespace),
      permalinkBase: path.join(process.env.linkedAgentPath, strToSlug(linkedAgentNamespace))
    }));

    return linkedAgentNamespaceCollection;
  });

  // ROSIE: Ignore sef files
  config.watchIgnores.add('**/*.sef.json');

  // ROSIE: Compile XSLT
  config.on("eleventy.before", ({ dir, runMode, outputMode }) => {
    const xsltfiles = glob.sync('**/*.xsl');
    for (const myfile of xsltfiles) {
      outputFile = myfile.replace('.xsl', '.sef.json')
      try {
        execSync(`xslt3 -t -xsl:${myfile} -export:${outputFile} -nogo -relocate:on -ns:##html5`);
      } catch (err) {
        console.log(`Compilation failed with error [${err}].`)
      }

    }
  });

  // Rosie: Add Search index
  config.addShortcode('searchIndex', article => searchIndex(article));

  config.on(
    "eleventy.after",
    async ({ dir, results, runMode, outputMode }) => {
      require('dotenv').config();
      const readCSV = require('./src/_data/readCSV.js');
      const slugify = require('slugify');

      var path = require('path');

      // Run me after the build ends
      console.log("eleventy after plugin run;.");

      // Precompile the lunr index.
      const compiledIndexFilename = path.join(dir.output, "index.json");
      const rawIndexFilename = path.join(dir.output, "index-raw.json");
      const fs = require('node:fs/promises');
      var lunr = require('lunr');
      try {
        const index_content = await fs.readFile(rawIndexFilename, { encoding: 'utf8' });
        const documents = JSON.parse(index_content)
        var idx = lunr(function () {
          this.ref('id')
          this.field('title')
          this.field('content')

          documents.forEach(function (doc) {
            this.add(doc)
          }, this)
        })
        fs.writeFile(compiledIndexFilename, JSON.stringify(idx));
      } catch (err) {
        console.error(err)
      }

    });

  // fs.writeFile(compiledIndexFilename, JSON.stringify(index));

  // Tell 11ty to use the .eleventyignore and ignore our .gitignore file
  config.setUseGitIgnore(false);

  config.amendLibrary("md", mdLib => mdLib.enable("code"));
  config.addGlobalData('contentPath', process.env.contentPath);
  config.addGlobalData('linkedAgentPath', process.env.linkedAgentPath);
  config.addGlobalData('pathPrefix', process.env.pathPrefix);
  config.addGlobalData('islandtyFieldInfo', await fieldConfigHelper.getMergedFieldConfig());

  // Add configurations at the top-level into Eleventy.
  siteConfig = require('./config/site.json');
  config.addGlobalData('site', siteConfig);

  // Add field config to Eleventy
  fieldConfig = require('./' + path.join(stagingDir, 'mergedFieldConfig.json'));
  config.addGlobalData('islandtyFieldInfo', fieldConfig);


  // https://nodejs.org/api/util.html#util_util_inspect_object_options
  const inspect = require("util").inspect;

  module.exports = (eleventyConfig) => {
  };

  return {
    markdownTemplateEngine: 'njk',
    dataTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    pathPrefix: process.env.pathPrefix,
    dir: {
      input: 'src',
      output: process.env.outputDir ? process.env.outputDir : 'web'
    }
  };
};
