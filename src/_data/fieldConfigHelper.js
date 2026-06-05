import readCSVModule from './readCSV.js';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

async function getMergedFieldConfig() {
  // Load JSON config via dynamic import to preserve error handling
  let jsonConfig;
  try {
    jsonConfig = (await import('../../config/islandtyFieldInfo.json', { with: { type: 'json' } })).default;
  } catch (error) {
    console.error('Error loading JSON field config:', error.message);
    jsonConfig = {};
  }

  const csvOverrideEnabled = process.env.CSVOverrideFieldInfo === 'true';

  // Only proceed with CSV processing if override is enabled
  let csvFieldInfo = { labels: {}, cardinality: {} };
  if (csvOverrideEnabled) {
    try {
      const result = await readCSVModule();
      if (result.fieldInfo
        && Object.keys(result.fieldInfo.labels).length > 0
      ) {
        csvFieldInfo = result.fieldInfo;
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

export { getMergedFieldConfig };
