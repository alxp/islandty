import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';

// Dynamic imports for CJS modules (reliable cross-module-system interop)
const { loadEnvSync, resetTestEnvironmentSync } = await import('../helpers.js');
const PagedContentModule = await import(
  '../../src/islandty/ContentModels/PagedContent.js'
);
const PagedContentModel = PagedContentModule.default;
const IslandtyHelpersModule = await import('../../src/_data/islandtyHelpers.js');
const { generateIiifMetadata } = IslandtyHelpersModule;

// ESM-compatible imports
const sharp = await import('sharp').then((m) => m.default);
const yaml = await import('js-yaml').then((m) => m.default);

// 1. Load test environment
loadEnvSync('fixtures/config/.env.test');
resetTestEnvironmentSync();

const testDir = path.join(
  process.env.outputDir,
  process.env.contentPath,
  '1',
  'iiif',
);
const canvasDir = path.join(testDir, '_page');
const manifestPath = path.join(testDir, 'index.json');
const sourceImagePath = path.join(canvasDir, 'image.jpg');
const thumbPath = path.join(canvasDir, 'thumb.jpg');
const testImage = 'tests/fixtures/media/image.jpg'; // 600x776 JPEG

describe('IIIF manifest generation', () => {
  let updatedManifest;

  beforeAll(async () => {
    // Set up the IIIF directory structure
    await fsp.mkdir(canvasDir, { recursive: true });

    // Copy the test image as the "source" for the canvas
    await fsp.copyFile(testImage, sourceImagePath);

    // Create a dummy 100x100 thumb.jpg (simulating biiif's output)
    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 200, g: 200, b: 200 },
      },
    })
      .jpeg()
      .toFile(thumbPath);

    // Create a mock manifest simulating what biiif produces
    const serverHost = process.env.serverHost || 'http://localhost:8080';
    const mockManifest = {
      '@context': [
        'http://www.w3.org/ns/anno.jsonld',
        'http://iiif.io/api/presentation/3/context.json',
      ],
      id: `${serverHost}/${process.env.contentPath}/1/iiif/index.json`,
      type: 'Manifest',
      behavior: ['paged'],
      items: [
        {
          id: `${serverHost}/${process.env.contentPath}/1/iiif/index.json/canvas/0`,
          type: 'Canvas',
          width: 600,
          height: 776,
          items: [
            {
              id: `${serverHost}/${process.env.contentPath}/1/iiif/index.json/canvas/0/annotationpage/0`,
              type: 'AnnotationPage',
              items: [
                {
                  id: `${serverHost}/${process.env.contentPath}/1/iiif/index.json/canvas/0/annotation/0`,
                  type: 'Annotation',
                  motivation: 'painting',
                  body: {
                    id: `${serverHost}/${process.env.contentPath}/1/iiif/_page/image.jpg`,
                    type: 'Image',
                    format: 'image/jpeg',
                    width: 600,
                    height: 776,
                  },
                  target: `${serverHost}/${process.env.contentPath}/1/iiif/index.json/canvas/0`,
                },
              ],
            },
          ],
          thumbnail: [
            {
              id: `${serverHost}/${process.env.contentPath}/1/iiif/_page/thumb.jpg`,
              type: 'Image',
              // NOTE: no width/height — this is the pre-fix state
            },
          ],
        },
      ],
    };

    await fsp.writeFile(manifestPath, JSON.stringify(mockManifest, null, 2));

    // Run enhanceThumbnails
    const pagedContent = new PagedContentModel();
    await pagedContent.enhanceThumbnails(testDir);

    const raw = await fsp.readFile(manifestPath, 'utf8');
    updatedManifest = JSON.parse(raw);
  });

  afterAll(async () => {
    try {
      await fsp.rm(path.join(process.env.outputDir, process.env.contentPath), {
        recursive: true,
        force: true,
      });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('enhanceThumbnails', () => {
    test('adds width to thumbnail resource', () => {
      const thumb = updatedManifest.items[0].thumbnail[0];
      expect(thumb.width).toBeDefined();
      expect(typeof thumb.width).toBe('number');
      expect(thumb.width).toBeGreaterThan(0);
    });

    test('adds height to thumbnail resource', () => {
      const thumb = updatedManifest.items[0].thumbnail[0];
      expect(thumb.height).toBeDefined();
      expect(typeof thumb.height).toBe('number');
      expect(thumb.height).toBeGreaterThan(0);
    });

    test('adds format to thumbnail resource', () => {
      const thumb = updatedManifest.items[0].thumbnail[0];
      expect(thumb.format).toBe('image/jpeg');
    });

    test('thumbnail width matches the target width (aspect-ratio-preserved)', () => {
      const thumb = updatedManifest.items[0].thumbnail[0];
      expect(thumb.width).toBe(200);
    });

    test('thumbnail height preserves aspect ratio (not square-cropped)', () => {
      const thumb = updatedManifest.items[0].thumbnail[0];
      // Source is 600x776, so at width 200: height = 776/600 * 200 = ~259
      expect(thumb.height).toBeGreaterThan(thumb.width);
    });

    test('regenerated thumbnail file has correct dimensions on disk', async () => {
      const metadata = await sharp(thumbPath).metadata();
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBeGreaterThan(metadata.width);
    });

    test('canvas retains its width dimension', () => {
      expect(updatedManifest.items[0].width).toBeDefined();
      expect(updatedManifest.items[0].width).toBe(600);
    });

    test('canvas retains its height dimension', () => {
      expect(updatedManifest.items[0].height).toBeDefined();
      expect(updatedManifest.items[0].height).toBe(776);
    });

    test('annotation body retains its width dimension', () => {
      const body = updatedManifest.items[0].items[0].items[0].body;
      expect(body.width).toBeDefined();
      expect(body.width).toBe(600);
    });

    test('annotation body retains its height dimension', () => {
      const body = updatedManifest.items[0].items[0].items[0].body;
      expect(body.height).toBeDefined();
      expect(body.height).toBe(776);
    });
  });

  describe('manifest behavior', () => {
    test('islandtyHelpers generates behavior: paged (not individuals)', () => {
      const tempDir = path.join(
        process.env.outputDir,
        process.env.contentPath,
        'behavior-test',
      );

      fs.mkdirSync(tempDir, { recursive: true });

      const mockBook = {
        title: 'Test Book',
        field_description: 'Test description',
        field_rights: 'CC-BY',
      };

      generateIiifMetadata(mockBook, tempDir);

      const infoYml = yaml.load(
        fs.readFileSync(path.join(tempDir, 'info.yml'), 'utf8'),
      );

      expect(infoYml.behavior).toBe('paged');
      expect(infoYml.behavior).not.toBe('individuals');

      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });
});
