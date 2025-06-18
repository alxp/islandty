const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

// Synchronous environment reset
const resetTestEnvironmentSync = () => {
  const outputDir = path.resolve(__dirname, '../output');
  try {
    if (fs.existsSync(outputDir)) {
      fs.rmdirSync(outputDir, { recursive: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });
  } catch (err) {
    console.error('Test cleanup failed:', err);
  }
};

// Synchronous environment loading
const loadEnvSync = () => {
  const envPath = path.resolve(__dirname, 'fixtures/config/.env.test');
  const envFile = fs.readFileSync(envPath, 'utf8');
  const envConfig = dotenv.parse(envFile);

  for (const key in envConfig) {
    process.env[key] = envConfig[key];
  }

  console.log('Test environment loaded:');
  console.log('dataFileName:', process.env.dataFileName);
  console.log('inputMediaPath:', process.env.inputMediaPath);
  console.log('outputDir:', process.env.outputDir);
};

// Asynchronous file check
const fileExists = async (filePath) => {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  resetTestEnvironmentSync,
  loadEnvSync,
  fileExists
};
