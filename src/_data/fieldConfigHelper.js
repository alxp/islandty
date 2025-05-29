// src/_data/fieldConfigHelper.js
const validateFieldConfig = (config) => {
  const validCardinalities = new Set(['1', '-1']);

  for (const [fieldName, fieldData] of Object.entries(config)) {
    if (fieldData.cardinality && !validCardinalities.has(fieldData.cardinality)) {
      console.warn(`Invalid cardinality '${fieldData.cardinality}' for field ${fieldName}`);
      fieldData.cardinality = '1'; // Default to single value
    }
  }
  return config;
};

module.exports = {
  validateFieldConfig
};
