const fs = require('fs');
const path = require('path');
const { execSync } = require('node:child_process');
const { inspect } = require('util');
const glob = require('glob');
require('dotenv').config();

// Plugins
const rssPlugin = require('@11ty/eleventy-plugin-rss');
const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");
const miradorPlugin = require('eleventy-plugin-mirador');

// Custom helpers and filters
const linkedAgentHelper = require('./src/islandty/linkedAgentHelper');
const dateFilter = require('./src/filters/date-filter.js');
const w3DateFilter = require('./src/filters/w3-date-filter.js');
const htmlMinTransform = require('./src/transforms/html-min-transform.js');
const fieldConfigHelper = require('./src/_data/fieldConfigHelper.js');
const { searchIndex } = require('./src/_data/islandtyHelpers.js');

// Configuration flags
const isProduction = process.env.NODE_ENV === 'production';

module.exports = async eleventyConfig => {
  // ========================================
  // Server Configuration
  // ========================================
  eleventyConfig.setServerOptions({
    liveReload: true,
    domDiff: true,
    port: 8080,
    watch: [],
    showAllHosts: false,
    https: {},
    encoding: "utf-8"
  });

  // ========================================
  // Filters
  // ========================================
  eleventyConfig.addFilter("debug", content => `<pre>${inspect(content)}</pre>`);
  eleventyConfig.addFilter('dateFilter', dateFilter);
  eleventyConfig.addFilter('w3DateFilter', w3DateFilter);
  eleventyConfig.addFilter('getGlobalData', data => require(`./src/_data/${data}.csv`));
  eleventyConfig.addFilter('getLinkFromTitle', (collection, title) =>
    collection.find(item => item.title === title)?.link || ''
  );

  // ========================================
  // Transforms
  // ========================================
  // Minify HTML in production only
  if (isProduction) {
    eleventyConfig.addTransform('htmlmin', htmlMinTransform);
  }

  // ========================================
  // Plugins
  // ========================================
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);
  eleventyConfig.addPlugin(rssPlugin);
  eleventyConfig.addPlugin(miradorPlugin, {
    miradorAppUrl: "/js/mirador.js",
    window: {
      textOverlay: {
        enabled: true,
        selectable: true,
        visible: false
      }
    }
  });

  // ========================================
  // Shortcodes
  // ========================================
  eleventyConfig.addShortcode("mediaTrackLabel", (topLabel, kind, langCode) => {
    const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });
    return `${topLabel} ${kind} ${languageNames.of(langCode)}`;
  });

  eleventyConfig.addShortcode('searchIndex', article => searchIndex(article));

  // ========================================
  // Collections
  // ========================================
  const stagingDir = process.env.stagingDir || "src/islandty/staging";
  const objectStagingDir = path.join(stagingDir, process.env.objectStagingPath || "object");

  eleventyConfig.addCollection('allIslandtyObjects', collection =>
    [...collection.getFilteredByGlob(path.join(objectStagingDir, '*.md'))]
  );

  // Linked agent configuration
  const linkedAgentStagingPath = process.env.linkedAgentStagingPath || "linked-agent";
  const linkedAgentDir = path.join(stagingDir, linkedAgentStagingPath);
  const linkedAgentPath = process.env.linkedAgentPath;
  linkedAgentHelper.configureLinkedAgentCollections(eleventyConfig, linkedAgentDir, linkedAgentPath);

  // ========================================
  // Event Hooks
  // ========================================
  // Pre-build: Compile XSLT files
  eleventyConfig.on("eleventy.before", () => {
    const xsltFiles = glob.sync('**/*.xsl');
    for (const file of xsltFiles) {
      const outputFile = file.replace('.xsl', '.sef.json');
      try {
        execSync(`xslt3 -t -xsl:${file} -export:${outputFile} -nogo -relocate:on -ns:##html5`);
      } catch (err) {
        console.error(`XSLT compilation failed for ${file}:`, err);
      }
    }
  });

  // Post-build: Create search index
  eleventyConfig.on("eleventy.after", async ({ dir }) => {
    console.log("Post-build process started");
    const lunr = require('lunr');
    const fsPromises = require('node:fs/promises');

    const compiledIndexPath = path.join(dir.output, "index.json");
    const rawIndexPath = path.join(dir.output, "index-raw.json");

    try {
      const indexContent = await fsPromises.readFile(rawIndexPath, 'utf8');
      const documents = JSON.parse(indexContent);

      const idx = lunr(function () {
        this.ref('id');
        this.field('title');
        this.field('content');
        documents.forEach(doc => this.add(doc));
      });

      await fsPromises.writeFile(compiledIndexPath, JSON.stringify(idx));
    } catch (err) {
      console.error("Search index creation failed:", err);
    }
  });

  // ========================================
  // Global Configuration
  // ========================================
  eleventyConfig.setUseGitIgnore(false);
  eleventyConfig.watchIgnores.add('**/*.sef.json');  // Ignore SEF files

  // Markdown configuration
  eleventyConfig.amendLibrary("md", mdLib => mdLib.enable("code"));

  // Global data
  eleventyConfig.addGlobalData('contentPath', process.env.contentPath);
  eleventyConfig.addGlobalData('linkedAgentPath', process.env.linkedAgentPath);
  eleventyConfig.addGlobalData('pathPrefix', process.env.pathPrefix);
  eleventyConfig.addGlobalData('islandtyFieldInfo', await fieldConfigHelper.getMergedFieldConfig());

  // Site configuration
  const siteConfig = require('./config/site.json');
  eleventyConfig.addGlobalData('site', siteConfig);

  // Field configuration (overrides previous islandtyFieldInfo)
  const fieldConfig = require('./config/mergedIslandtyFieldInfo.json');
  eleventyConfig.addGlobalData('islandtyFieldInfo', fieldConfig);

  // ========================================
  // Eleventy Configuration
  // ========================================
  return {
    markdownTemplateEngine: 'njk',
    dataTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    pathPrefix: process.env.pathPrefix,
    dir: {
      input: 'src',
      output: process.env.outputDir || 'web'
    }
  };
};
