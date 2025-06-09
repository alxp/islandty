const fs = require('fs').promises;
const path = require('path');

module.exports = {
  resetTestEnvironment: async () => {
    const outputDir = path.join(__dirname, 'output');
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
      await fs.mkdir(outputDir, { recursive: true });
    } catch (err) {
      console.error('Test cleanup failed:', err);
    }
  },

  loadEnv: () => {
    require('dotenv').config({ path: path.join(__dirname, 'fixtures/config/.env.test') });
  },

  fileExists: async (filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
};
