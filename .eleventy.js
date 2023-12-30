const rssPlugin = require('@11ty/eleventy-plugin-rss');
// Filters
const dateFilter = require('./src/filters/date-filter.js');
const w3DateFilter = require('./src/filters/w3-date-filter.js');

// Transforms
const htmlMinTransform = require('./src/transforms/html-min-transform.js');

const footnotes = require('eleventy-plugin-footnotes')


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

  // only minify HTML if we are in productionbecause it slows builds _right_ down
  if (isProduction) {
    config.addTransform('htmlmin', htmlMinTransform);
  }

// Plugins
config.addPlugin(rssPlugin);

config.addPlugin(footnotes);

  const sortByDisplayOrder = require('./src/utils/sort-by-display-order.js');
  // Returns work items, sorted by display order
  config.addCollection('work', collection => {
    return sortByDisplayOrder(collection.getFilteredByGlob('./src/work/*.md'));
  });

  // Returns work items, sorted by display order then filtered by featured
  config.addCollection('featuredWork', collection => {
    return sortByDisplayOrder(collection.getFilteredByGlob('./src/work/*.md')).filter(
      x => x.data.featured
    );
  });

  // A collection of blog posts in reverse order.
  config.addCollection('blog', collection => {
    return [...collection.getFilteredByGlob('./src/posts/*.md')].reverse();
 });
 config.addCollection('people', collection => {
   return collection.getFilteredByGlob('./src/people/*.md').sort((a, b) => {
     return Number(a.fileSlug) > Number(b.fileslug) ? 1 : -1;
   });
 });

// Tell 11ty to use the .eleventyignore and ignore our .gitignore file
config.setUseGitIgnore(false);

config.amendLibrary("md", mdLib => mdLib.enable("code"));

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
