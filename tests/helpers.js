const fs = require('fs').promises;
const path = require('path');

const resetTestEnvironment = async () => {
  const outputDir = path.resolve(__dirname, 'output');
  try {
    await fs.rm(outputDir, { recursive: true, force: true });
    await fs.mkdir(outputDir, { recursive: true });
  } catch (err) {
    console.error('Test cleanup failed:', err);
  }
};

const loadEnv = () => {
  require('dotenv').config({ path: path.resolve(__dirname, 'fixtures/config/.env.test') });
};

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const setupHooks = () => {
  afterAll(async () => {
    await resetTestEnvironment();
  });
};

module.exports = {
  resetTestEnvironment,
  loadEnv,
  fileExists,
  setupHooks
};
