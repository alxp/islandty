// src/islandty/generateFieldConfig.js
const fs = require('fs').promises;
const path = require('path');
const readCSVCore = require('../_data/csvReaderCore');
const { validateFieldConfig } = require('../_data/fieldConfigHelper');

async function generateMergedFieldConfig() {
  // Load JSON config
  const jsonConfigPath = path.join(__dirname, '../../config/islandtyFieldInfo.json');
  const jsonConfig = require(jsonConfigPath);

  let csvFieldInfo = { labels: {}, cardinality: {} };

  if (process.env.CSVOverrideFieldInfo === 'true') {
    try {
      const result = await readCSVCore();
      csvFieldInfo = result.fieldInfo;
      console.log('CSV field info override is enabled - merging with JSON config');
    } catch (error) {
      console.error('CSV config load failed:', error.message);
    }
  } else {
    console.log('CSV field info override is disabled - using JSON config only');
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

  // Validate and save merged config
  const validatedConfig = validateFieldConfig(mergedConfig);
  const mergedConfigPath = path.join(__dirname, '../../config/mergedIslandtyFieldInfo.json');
  await fs.writeFile(mergedConfigPath, JSON.stringify(validatedConfig, null, 2));

  return validatedConfig;
}

module.exports = generateMergedFieldConfig;
