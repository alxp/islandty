const readCSVModule = require('./readCSV.js');
const path = require('path');

async function getMergedFieldConfig() {
  // Load JSON config
  let jsonConfig;
  try {
    jsonConfig = require('../../config/islandtyFieldInfo.json');
  } catch (error) {
    console.error('Error loading JSON field config:', error.message);
    jsonConfig = {};
  }

  // Try to get CSV field info
  let csvFieldInfo = { labels: {}, cardinality: {} };
  try {
    const result = await readCSVModule();
    if (result.fieldInfo) {
      csvFieldInfo = result.fieldInfo;
    }
  } catch (error) {
    console.log('Could not load CSV field info:', error.message);
  }

  // Create merged configuration
  const mergedConfig = { ...jsonConfig };

  // Update existing fields with CSV data
  for (const [fieldName, fieldData] of Object.entries(mergedConfig)) {
    if (csvFieldInfo.labels[fieldName]) {
      fieldData.label = csvFieldInfo.labels[fieldName];
    }
    if (csvFieldInfo.cardinality[fieldName]) {
      fieldData.cardinality = csvFieldInfo.cardinality[fieldName];
    }
  }

  // Add new fields from CSV
  for (const fieldName in csvFieldInfo.labels) {
    if (!mergedConfig[fieldName]) {
      mergedConfig[fieldName] = {
        label: csvFieldInfo.labels[fieldName],
        cardinality: csvFieldInfo.cardinality[fieldName] || '1'
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
