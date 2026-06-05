import { getMergedFieldConfig } from '../../src/_data/fieldConfigHelper.js';

describe('fieldConfigHelper', () => {
  describe('getMergedFieldConfig', () => {
    test('returns valid field configuration', async () => {
      process.env.CSVOverrideFieldInfo = 'false';

      const result = await getMergedFieldConfig();

      // The real config file has at least these known fields
      expect(result.id).toBeDefined();
      expect(result.id.label).toBe('ID');
      expect(result.id.cardinality).toBe('1');
      expect(result.title).toBeDefined();
      expect(result.title.label).toBe('Title');

      // All cardinalities should be valid ('1' or '-1')
      for (const [name, info] of Object.entries(result)) {
        const cardinality = info.cardinality;
        expect(
          cardinality === '1' || cardinality === '-1' || cardinality === undefined
        ).toBe(true);
      }
    });

    test('returns file-type fields with correct metadata', () => {
      process.env.CSVOverrideFieldInfo = 'false';
      return getMergedFieldConfig().then((result) => {
        // File fields from the real config
        expect(result.file.type).toBe('file');
        expect(result.file.downloadable).toBe(true);
      });
    });

    test('CSV override disabled message appears in console', async () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      process.env.CSVOverrideFieldInfo = 'false';

      await getMergedFieldConfig();

      const disabledMessage = consoleLog.mock.calls.find(([msg]) =>
        typeof msg === 'string' && msg.includes('CSV field info override is disabled')
      );
      expect(disabledMessage).toBeTruthy();

      consoleLog.mockRestore();
    });
  });
});
