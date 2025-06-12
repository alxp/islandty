const { resetTestEnvironmentSync, loadEnvSync, fileExists } = require('../../helpers');

// 1. Synchronously load environment FIRST
loadEnvSync();

// 2. Synchronously reset environment
resetTestEnvironmentSync();

// 3. NOW require the application modules AFTER environment is set
const { main } = require('../../../src/islandty/commands/readCSV');

// 4. Define tests synchronously
describe('readCSV command', () => {
  beforeAll(async () => {
    await main();
  });

  test('generates object Markdown files', async () => {
    const objectFile = `${process.env.stagingDir}/${process.env.objectStagingPath}/1.md`;
    console.log('Checking object file at:', objectFile);
    expect(await fileExists(objectFile)).toBe(true);
  });

  test('copies media files to output', async () => {
    const mediaFile = `${process.env.outputDir}/${process.env.contentPath}/1/file1.txt`;
    console.log('Checking media file at:', mediaFile);
    expect(await fileExists(mediaFile)).toBe(true);
  });

  test('generates linked agent files', async () => {
    const agentFile = `${process.env.stagingDir}/${process.env.linkedAgentStagingPath}/relators.json`;
    console.log('Checking agent file at:', agentFile);
    expect(await fileExists(agentFile)).toBe(true);
  });
});
