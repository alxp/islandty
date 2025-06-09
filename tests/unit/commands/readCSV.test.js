const { resetTestEnvironment, loadEnv, fileExists } = require('../../helpers');
const readCSVCommand = require('../../../src/islandty/commands/readCSV');

describe('readCSV command', () => {
  beforeAll(async () => {
    loadEnv();
    await resetTestEnvironment();
    await readCSVCommand.main();
  });

  test('generates object Markdown files', async () => {
    const objectFile = path.join(
      process.env.stagingDir,
      process.env.objectStagingPath,
      '1.md'
    );
    expect(await fileExists(objectFile)).toBe(true);
  });

  test('copies media files to output', async () => {
    const mediaFile = path.join(
      process.env.outputDir,
      process.env.contentPath,
      '1',
      'file1.txt'
    );
    expect(await fileExists(mediaFile)).toBe(true);
  });

  test('generates linked agent files', async () => {
    const agentFile = path.join(
      process.env.stagingDir,
      process.env.linkedAgentStagingPath,
      'relators.json'
    );
    expect(await fileExists(agentFile)).toBe(true);
  });
});
