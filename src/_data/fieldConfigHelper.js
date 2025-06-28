const readCSVModule = require('./readCSV.js');
const path = require('path');
require('dotenv').config();

async function getMergedFieldConfig() {
  // Load JSON config
  let jsonConfig;
  try {
    jsonConfig = require('../../config/fieldConfig.json');
  } catch (error) {
    console.error('Error loading JSON field config:', error.message);
    jsonConfig = {};
  }

  const csvOverrideEnabled = process.env.CSVOverrideFieldInfo === 'true';

  // Only proceed with CSV processing if override is enabled
  let csvFieldConfig = { labels: {}, cardinality: {} };
  if (csvOverrideEnabled) {
    try {
      const result = await readCSVModule();
      if (result.fieldConfig
        && Object.keys(csvFieldConfig['labels']).length > 0
      ) {
        csvFieldConfig = result.fieldConfig;
        console.log('CSV field info override is enabled - merging with JSON config');
      }
    } catch (error) {
      console.log('Could not load CSV field info:', error.message);
    }
  } else {
    console.log('CSV field info override is disabled - using JSON config only');
  }
  // Create merged configuration
  const mergedConfig = { ...jsonConfig };

  // Update existing fields with CSV data
  for (const [fieldName, fieldData] of Object.entries(mergedConfig)) {
    if (csvFieldConfig.labels[fieldName]) {
      fieldData.label = csvFieldConfig.labels[fieldName];
    }
    if (csvFieldConfig.cardinality[fieldName]) {
      fieldData.cardinality = csvFieldConfig.cardinality[fieldName];
    }
  }

  // Add new fields from CSV
  for (const fieldName in csvFieldConfig.labels) {
    if (!mergedConfig[fieldName]) {
      mergedConfig[fieldName] = {
        label: csvFieldConfig.labels[fieldName],
        cardinality: csvFieldConfig.cardinality[fieldName] || '1'
      };
    }
  }

  return validateFieldConfig(mergedConfig);
}

function validateFieldConfig(config) {
  const validCardinalities = new Set(['1', '-1']);

  for (const [fieldName, fieldData] of Object.entries(config)) {
    if (fieldData.cardinality && !validCardinalities.has(fieldData.cardinality)) {
      console.warn(`Invalid cardinality '${fieldData.cardinality}' for field ${fieldName}`);
      fieldData.cardinality = '1'; // Default to single value
    }
  }
  return config;
}

module.exports = {
  getMergedFieldConfig
};
