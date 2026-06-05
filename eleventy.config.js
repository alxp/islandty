import fs from 'fs';
import path from 'path';
import { execSync } from 'node:child_process';
import { inspect } from 'util';
import { globSync } from 'glob';
import 'dotenv/config';

// Plugins
import rssPlugin from '@11ty/eleventy-plugin-rss';
import { EleventyHtmlBasePlugin } from "@11ty/eleventy";
import miradorPlugin from 'eleventy-plugin-mirador';

// Custom helpers and filters
import * as linkedAgentHelper from './src/islandty/linkedAgentHelper.js';
import dateFilter from './src/filters/date-filter.js';
import w3DateFilter from './src/filters/w3-date-filter.js';
import htmlMinTransform from './src/transforms/html-min-transform.js';
import { getMergedFieldConfig } from './src/_data/fieldConfigHelper.js';
import { searchIndex } from './src/_data/islandtyHelpers.js';

// JSON configs
import siteConfig from './config/site.json' with { type: 'json' };
import fieldConfig from './config/mergedIslandtyFieldInfo.json' with { type: 'json' };

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Configuration flags
const isProduction = process.env.NODE_ENV === 'production';

export default async eleventyConfig => {
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
    const xsltFiles = globSync('**/*.xsl');
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
  eleventyConfig.addGlobalData('islandtyFieldInfo', await getMergedFieldConfig());

  // Site configuration
  eleventyConfig.addGlobalData('site', siteConfig);

  // Field configuration (overrides previous islandtyFieldInfo)
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
