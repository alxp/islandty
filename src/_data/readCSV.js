// src/_data/readCSV.js
const readCSVCore = require('./csvReaderCore');
const islandtyHelpers = require('./islandtyHelpers');

module.exports = async function (fieldInfo) {
  try {
    const { items } = await readCSVCore();

    return {
      items: items.map(item =>
        islandtyHelpers.transformKeys(
          islandtyHelpers.cleanInputData(item, fieldInfo),
          fieldInfo
        )
      ),
      fieldInfo
    };
  } catch (err) {
    console.error('CSV processing error:', err);
    throw err;
  }
};
