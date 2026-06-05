import { resetTestEnvironmentSync, loadEnvSync, fileExists } from '../../helpers.js';

describe('readCSV command', () => {
  let main;

  beforeAll(async () => {
    // Staged loading: env must be set BEFORE importing application modules
    loadEnvSync('fixtures/config/.env.test');
    resetTestEnvironmentSync();

    const mod = await import('../../../src/islandty/commands/readCSV.js');
    main = mod.main;
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
