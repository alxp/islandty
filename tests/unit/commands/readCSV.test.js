const path = require('path');
const { resetTestEnvironment, setupHooks, loadEnv, fileExists } = require('../../helpers');
const { main } = require('../../../src/islandty/commands/readCSV');

describe('readCSV command', () => {
  setupHooks();

  beforeAll(async () => {
    loadEnv();
    await resetTestEnvironment();
    await main();
  });

  test('generates object Markdown files', async () => {
    // Use the same path pattern as in your application
    const objectFile = path.resolve(
      process.env.stagingDir,
      process.env.objectStagingPath,
      '1.md'
    );
    console.log('Checking object file at:', objectFile);
    expect(await fileExists(objectFile)).toBe(true);
  });

  test('copies media files to output', async () => {
    // Add the content subdirectory pattern
    const mediaFile = path.resolve(
      process.env.outputDir,
      process.env.contentPath,
      '1',
      'content',  // Add this
      'file1.txt'
    );
    console.log('Checking media file at:', mediaFile);
    expect(await fileExists(mediaFile)).toBe(true);
  });

  test('generates linked agent files', async () => {
    const agentFile = path.resolve(
      process.env.stagingDir,
      process.env.linkedAgentStagingPath,
      'relators.json'
    );
    console.log('Checking agent file at:', agentFile);
    expect(await fileExists(agentFile)).toBe(true);
  });
});
