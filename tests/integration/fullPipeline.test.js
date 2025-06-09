const { resetTestEnvironment, loadEnv } = require('../helpers');
const readCSVCommand = require('../../src/islandty/commands/readCSV');
const Eleventy = require('@11ty/eleventy');

describe('Full pipeline integration', () => {
  beforeAll(async () => {
    loadEnv();
    await resetTestEnvironment();

    // Step 1: Process CSV
    await readCSVCommand.main();

    // Step 2: Run Eleventy
    const elev = new Eleventy(
      process.env.stagingDir,
      path.join(process.env.outputDir, 'build')
    );
    await elev.write();
  });

  test('generates final HTML output', async () => {
    const htmlFile = path.join(
      process.env.outputDir,
      'build',
      process.env.contentPath,
      '1',
      'index.html'
    );
    const content = await fs.readFile(htmlFile, 'utf8');
    expect(content).toContain('Test Item');
    expect(content).toContain('Test Creator');
  });
});
