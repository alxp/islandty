const rssPlugin = require('@11ty/eleventy-plugin-rss');
// Filters
const dateFilter = require('./src/filters/date-filter.js');
const w3DateFilter = require('./src/filters/w3-date-filter.js');
require('dotenv').config();
// Transforms
const htmlMinTransform = require('./src/transforms/html-min-transform.js');

const { itemsWithContentModel, searchIndex } = require('./src/_data/islandoraHelpers.js');

const { execSync } = require('node:child_process');
const { glob } = require('glob')

// Create a helpful production flag
const isProduction = process.env.NODE_ENV == 'production';

module.exports = config => {

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
  config.addFilter('dateFilter', dateFilter);
  config.addFilter('w3DateFilter', w3DateFilter);

  config.addFilter('getGlobalData', (data) => {
    // if your global data lives elsewhere, this file path will need to change a bit
    return require(`./src/_data/${data}.csv`);
  });

  // only minify HTML if we are in productionbecause it slows builds _right_ down
  if (isProduction) {
    config.addTransform('htmlmin', htmlMinTransform);
  }

  // Plugins
  config.addPlugin(rssPlugin);

  // ROSIE: A collection of digital objects.
  config.addCollection('repo', collection => {
    return collection.getFilteredByGlob('./src/repo/**/*.njk');
  });

  // ROSIE: Ignore sef files
  config.watchIgnores.add('**/*.sef.json');

  // ROSIE: Compile XSLT
  config.on("eleventy.before", ({ dir, runMode, outputMode }) => {
    const xsltfiles =  glob.sync('**/*.xsl');
    for (const myfile of xsltfiles) {
      outputFile = myfile.replace('.xsl','.sef.json')
      try {
        execSync(`xslt3 -t -xsl:${myfile} -export:${outputFile} -nogo -relocate:on -ns:##html5`);
      }
      catch (err) {
        console.log(`Compilation failed with error [${err}].`)
      }

    }
  });

  // Rosie: Add Search index
  config.addShortcode('searchIndex', article => searchIndex(article));

  config.on(
		"eleventy.after",
		async ({ dir, results, runMode, outputMode }) => {
      const islandoraHelpers = require('./src/_data/islandoraHelpers.js');
      const readCSV = require('./src/_data/readCSV.js');

      var path = require('path');
      const { build:buildIiif } = require('biiif');
			// Run me after the build ends
      console.log("eleventy after plugin run;.");
      items = readCSV().items;
      books =islandoraHelpers.itemsWithContentModel(items, 'Paged Content' );
      for (const [key, book] of Object.entries(books)) {
      let base_dir = path.dirname(book.file);
      let full_path = path.join('./dist/images', base_dir, 'iiif');
      islandoraHelpers.generateIiifMetadata(book, full_path);
      buildIiif(full_path, process.env.serverHost + '/images/' +
       base_dir + '/iiif');

      }
    });



  // Tell 11ty to use the .eleventyignore and ignore our .gitignore file
  config.setUseGitIgnore(false);

  config.amendLibrary("md", mdLib => mdLib.enable("code"));
config.addGlobalData('contentPath', 'islandora/object');

  // https://nodejs.org/api/util.html#util_util_inspect_object_options
  const inspect = require("util").inspect;

  module.exports = (eleventyConfig) => {
  };

  return {
    markdownTemplateEngine: 'njk',
    dataTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    dir: {
      input: 'src',
      output: 'dist'
    }
  };
};
