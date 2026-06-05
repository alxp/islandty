import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Mirador integration', () => {
  const miradorJsPath = path.resolve(__dirname, '../../web/js/mirador.js');
  const entryPath = path.resolve(__dirname, '../../src/js/mirador-entry.js');

  // --- Bundle tests ---

  describe('mirador.js bundle', () => {
    test('entry module exists', () => {
      expect(fs.existsSync(entryPath)).toBe(true);
    });

    test('bundle exists after build', () => {
      if (!fs.existsSync(miradorJsPath)) {
        console.log('Skipping: mirador.js not found (build with compile_mirador=true first)');
        return;
      }
      const stat = fs.statSync(miradorJsPath);
      expect(stat.size).toBeGreaterThan(100000);
    });

    test('bundle exposes Mirador on window', () => {
      if (!fs.existsSync(miradorJsPath)) {
        return;
      }
      const content = fs.readFileSync(miradorJsPath, 'utf8');
      expect(content).toContain('window.Mirador=');
      expect(content).toContain('window.miradorPlugins=');
    });
  });

  // --- Embed output tests ---

  describe('embed HTML generation', () => {
    let embed, defaults;

    beforeAll(async () => {
      embed = (await import('../../node_modules/eleventy-plugin-mirador/src/libs/embed')).default;
      defaults = (await import('../../node_modules/eleventy-plugin-mirador/src/libs/defaultconfig')).default;
    });

    test('generates M4 config keys (not M3)', async () => {
      const html = await embed('test-viewer', '/manifests/test.json', defaults);

      // M4 keys should be present
      expect(html).toContain('manifestId');
      expect(html).toContain('canvasId');

      // M3 keys should NOT be present as Mirador config keys
      // loadedManifest was the M3 window key
      expect(html).not.toMatch(/"loadedManifest"|'loadedManifest'/);
      // M3 top-level manifests block should not exist
      expect(html).not.toContain('"manifests"');
      // provider was part of the M3 manifests config
      expect(html).not.toContain('"provider"');
    });

    test('includes script tag for mirador app bundle', async () => {
      const html = await embed('test-viewer', '/manifests/test.json', {
        ...defaults,
        miradorAppUrl: '/js/mirador.js',
      });

      expect(html).toContain('<script src="/js/mirador.js"></script>');
    });

    test('includes wrapper div with correct id', async () => {
      const html = await embed('my-viewer', '/manifests/test.json', defaults);
      expect(html).toContain('id="my-viewer"');
    });

    test('calls Mirador.viewer with id, window, and windows', async () => {
      const html = await embed('test-viewer', '/manifests/test.json', defaults);

      expect(html).toMatch(/Mirador\.viewer\(\{/);
      expect(html).toContain('id: "test-viewer"');
      expect(html).toContain('window:');
      expect(html).toContain('windows:');
    });

    test('passes plugins as second argument to Mirador.viewer', async () => {
      const html = await embed('test-viewer', '/manifests/test.json', defaults);
      expect(html).toContain('window.miradorPlugins || {}');
    });

    test('canvasId pattern is embedded for runtime resolution', async () => {
      const html = await embed('test-viewer', '/manifests/test.json', defaults);

      // The canvasIdPattern should appear in the generated JS (it's resolved at runtime)
      expect(html).toContain('canvas/');
      expect(html).toContain('{manifestUrl}');
      expect(html).toContain('{canvasIndex}');
      expect(html).toContain('.replace(');
    });

    test('constructs correct manifestId in window config', async () => {
      const manifestUrl = '/islandora/object/180/iiif/index.json';
      const html = await embed('test-viewer', manifestUrl, defaults);

      expect(html).toContain(`manifestId: "${manifestUrl}"`);
    });

    test('thumbnailNavigationPosition is included', async () => {
      const html = await embed('test-viewer', '/manifests/test.json', defaults);
      expect(html).toContain("thumbnailNavigationPosition: 'far-bottom'");
    });
  });

  // --- Config merge tests ---

  describe('plugin config merge', () => {
    let plugin;

    beforeAll(async () => {
      plugin = (await import('../../node_modules/eleventy-plugin-mirador/src/index')).default;
    });

    test('plugin exports a function', () => {
      expect(typeof plugin).toBe('function');
    });

    test('custom window config overrides defaults', async () => {
      // Simulate what eleventyConfig.addPlugin does by calling the plugin function
      const capturedShortcodes = {};
      const mockEleventyConfig = {
        addAsyncShortcode: (name, fn) => {
          capturedShortcodes[name] = fn;
        },
      };

      plugin(mockEleventyConfig, {
        window: {
          textOverlay: { enabled: true, selectable: true, visible: false },
        },
      });

      expect(capturedShortcodes.mirador).toBeDefined();

      const html = await capturedShortcodes.mirador(
        'test',
        '/manifests/test.json'
      );

      expect(html).toContain('"textOverlay"');
      expect(html).toContain('"enabled":true');
      expect(html).toContain('"selectable":true');
      expect(html).toContain('"visible":false');
    });
  });
});
