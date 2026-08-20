import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';

// Dynamic imports for CJS modules (reliable cross-module-system interop)
const { loadEnvSync, resetTestEnvironmentSync } = await import('../helpers.js');
const PagedContentModule = await import(
  '../../src/islandty/ContentModels/PagedContent.js'
);
const PagedContentModel = PagedContentModule.default;

// ESM-compatible imports
const sharp = await import('sharp').then((m) => m.default);

// 1. Load test environment
loadEnvSync('fixtures/config/.env.test');
resetTestEnvironmentSync();

// Isolate this file's output from the rest of the suite.
process.env.outputDir = path.resolve('tests/output/jp2test');
process.env.serverHost = process.env.serverHost || 'http://localhost:8080';

const jp2Fixture = 'tests/fixtures/media/image.jp2'; // 120x180 JP2 test pattern

const walkFiles = (dir, predicate = () => true) => {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (fs.statSync(p).isDirectory()) {
      results.push(...walkFiles(p, predicate));
    } else if (predicate(p)) {
      results.push(p);
    }
  }
  return results;
};

describe('JP2 tiling support', () => {
  test('sharp can read the JP2 fixture', async () => {
    try {
      const metadata = await sharp(jp2Fixture, {
        limitInputPixels: true,
      }).metadata();
      expect(metadata.format).toBe('jp2');
      expect(metadata.width).toBe(120);
      expect(metadata.height).toBe(180);
    } catch (err) {
      throw new Error(
        `sharp cannot read the JP2 fixture (${err.message}). ` +
          'JPEG 2000 support requires sharp built from source against ' +
          'Homebrew libvips (brew install vips) — the prebuilt sharp ' +
          'binaries cannot decode these files.',
      );
    }
  });

  test('generates IIIF tiles directly from the JP2', async () => {
    const tilesDir = path.join(process.env.outputDir, 'tiles');
    await fsp.rm(tilesDir, { recursive: true, force: true });

    await sharp(jp2Fixture, { limitInputPixels: true })
      .tile({ layout: 'iiif', id: 'https://example.org/img' })
      .toFile(tilesDir);

    const infoPath = path.join(tilesDir, 'info.json');
    expect(fs.existsSync(infoPath)).toBe(true);

    const info = JSON.parse(await fsp.readFile(infoPath, 'utf8'));
    expect(info.width).toBe(120);
    expect(info.height).toBe(180);

    const tileFiles = walkFiles(tilesDir, (p) => p.endsWith('.jpg'));
    expect(tileFiles.length).toBeGreaterThan(0);

    // The largest tile must be a valid image with actual content.
    const firstTileMeta = await sharp(tileFiles[0]).metadata();
    expect(firstTileMeta.width).toBeGreaterThan(0);
    expect(firstTileMeta.height).toBeGreaterThan(0);
  });

});

describe('paged content ingest tiles JP2s directly (no PNG conversion)', () => {
  const itemId = 'jp2-book';
  let paged;
  let item;
  let iiifPath;

  beforeAll(async () => {
    await fsp.rm(process.env.outputDir, { recursive: true, force: true });
    await fsp.mkdir(process.env.outputDir, { recursive: true });

    item = {
      id: itemId,
      title: 'JP2 Test Book',
      field_description: 'A book whose pages are JPEG 2000 images.',
      field_rights: 'CC-BY',
    };

    const pages = [{ file: 'image.jp2', hocr: null }];
    const filesMap = {
      'image.jp2': { actualSrc: path.resolve(jp2Fixture) },
    };

    paged = new PagedContentModel();
    iiifPath = path.join(
      process.env.outputDir,
      process.env.contentPath,
      itemId,
      'iiif',
    );

    await paged.createIIIFStructure(
      item,
      pages,
      filesMap,
      process.env.inputMediaPath,
      iiifPath,
    );
    await paged.processIIIFDerivatives(item, iiifPath);
  });

  afterAll(async () => {
    try {
      await fsp.rm(process.env.outputDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('copies the JP2 into the canvas directory unchanged', () => {
    const canvasImage = path.join(iiifPath, '_image', 'image.jp2');
    expect(fs.existsSync(canvasImage)).toBe(true);

    // The source fixture must remain — the old workaround deleted JP2s
    // after converting them.
    expect(fs.existsSync(path.resolve(jp2Fixture))).toBe(true);
  });

  test('creates no PNG files anywhere in the IIIF structure', () => {
    const pngFiles = walkFiles(iiifPath, (p) => p.endsWith('.png'));
    expect(pngFiles).toEqual([]);
  });

  test('manifest canvas body references the JP2 directly', async () => {
    const manifest = JSON.parse(
      await fsp.readFile(path.join(iiifPath, 'index.json'), 'utf8'),
    );
    expect(manifest.items.length).toBe(1);

    const body = manifest.items[0].items[0].items[0].body;
    expect(body.id.endsWith('.jp2')).toBe(true);
    expect(body.format).toBe('image/jp2');
    expect(body.width).toBe(120);
    expect(body.height).toBe(180);
  });

  test('generates a tile pyramid for the JP2 page', () => {
    const tilesInfo = path.join(iiifPath, '_image', '+tiles', 'info.json');
    expect(fs.existsSync(tilesInfo)).toBe(true);

    const info = JSON.parse(fs.readFileSync(tilesInfo, 'utf8'));
    expect(info.width).toBe(120);
    expect(info.height).toBe(180);

    const tileFiles = walkFiles(iiifPath, (p) => p.includes('+tiles') && p.endsWith('.jpg'));
    expect(tileFiles.length).toBeGreaterThan(0);
  });

  test('generates and enhances a thumbnail for the JP2 page', async () => {
    const thumbPath = path.join(iiifPath, '_image', 'thumb.jpg');
    expect(fs.existsSync(thumbPath)).toBe(true);

    const thumbMeta = await sharp(thumbPath).metadata();
    expect(thumbMeta.width).toBe(120); // source is narrower than THUMB_WIDTH
    expect(thumbMeta.height).toBeGreaterThan(0);

    const manifest = JSON.parse(
      await fsp.readFile(path.join(iiifPath, 'index.json'), 'utf8'),
    );
    const thumbnail = manifest.items[0].thumbnail[0];
    expect(thumbnail.width).toBe(120);
    expect(thumbnail.format).toBe('image/jpeg');
  });
});
