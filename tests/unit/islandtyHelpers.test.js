// No vi.mock() calls — they do not reliably intercept CJS require() in
// Vitest. All tests use real dependencies.

const path = require('path');

let islandtyHelpers;

beforeAll(() => {
  process.env.contentPath = 'test-content';
  process.env.linkedAgentPath = 'test-agents';
  process.env.outputDir = 'tests/output';
  process.env.pathPrefix = '';

  islandtyHelpers = require('../../src/_data/islandtyHelpers');
});

// ============================================================
// cleanInputData
// ============================================================
describe('cleanInputData', () => {
  test('maps node_id to id when id is missing', () => {
    const result = islandtyHelpers.cleanInputData([{ node_id: '5', title: 'A' }]);
    expect(result[0].id).toBe('5');
  });

  test('keeps existing id when present', () => {
    const result = islandtyHelpers.cleanInputData([{ id: '3', node_id: '5' }]);
    expect(result[0].id).toBe('3');
  });

  test('maps field_member_of to parent_id when parent_id is missing', () => {
    const result = islandtyHelpers.cleanInputData([
      { id: '1', parent_id: '', field_member_of: '1|2' },
    ]);
    expect(result[0].parent_id).toBe('1|2');
  });

  test('sets empty parent_id when both are missing', () => {
    const result = islandtyHelpers.cleanInputData([{ id: '1' }]);
    expect(result[0].parent_id).toBe('');
  });

  test('strips namespace prefix from field_model', () => {
    const result = islandtyHelpers.cleanInputData([
      { id: '1', field_model: 'islandora:page' },
    ]);
    expect(result[0].field_model).toBe('page');
  });

  test('converts "False" file fields: sets literal key fieldName', () => {
    // src line 51: newRecord.fieldName = '' (literal key, not variable)
    const result = islandtyHelpers.cleanInputData([
      { id: '1', title: 'T', file: 'False' },
    ]);
    // Literal key 'fieldName' gets set by the bug
    expect(result[0].fieldName).toBe('');
  });

  test('processes multiple records independently', () => {
    const input = [
      { node_id: 'a', title: 'First' },
      { id: 'b', node_id: 'ignored', title: 'Second' },
    ];
    const result = islandtyHelpers.cleanInputData(input);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });
});

// ============================================================
// getNested
// ============================================================
describe('getNested', () => {
  test('returns deeply nested value', () => {
    expect(islandtyHelpers.getNested({ a: { b: 'c' } }, 'a', 'b')).toBe('c');
  });

  test('returns undefined for missing path', () => {
    expect(islandtyHelpers.getNested({ a: {} }, 'a', 'x')).toBeUndefined();
  });

  test('returns null when intermediate is null', () => {
    // null && level returns null (not undefined)
    expect(islandtyHelpers.getNested({ a: null }, 'a', 'b')).toBeNull();
  });

  test('returns undefined when root key is absent', () => {
    expect(islandtyHelpers.getNested({}, 'a')).toBeUndefined();
  });

  test('returns the object itself with no path args', () => {
    const obj = { a: 1 };
    expect(islandtyHelpers.getNested(obj)).toBe(obj);
  });
});

// ============================================================
// strToSlug
// ============================================================
describe('strToSlug', () => {
  test('converts basic string to lowercase slug', () => {
    expect(islandtyHelpers.strToSlug('Hello World')).toBe('hello-world');
  });

  test('replaces ampersand with "and"', () => {
    const result = islandtyHelpers.strToSlug('Hello & World');
    expect(result).toBe('hello-and-world');
  });

  test('removes parentheses and other special chars', () => {
    const result = islandtyHelpers.strToSlug('Complex (with) stuff');
    expect(result).toBe('complex-with-stuff');
  });

  test('lowercases uppercase input', () => {
    expect(islandtyHelpers.strToSlug('UPPERCASE')).toBe('uppercase');
  });

  test('handles empty string', () => {
    expect(islandtyHelpers.strToSlug('')).toBe('');
  });
});

// ============================================================
// strToSlugWithCounter
// ============================================================
describe('strToSlugWithCounter', () => {
  test('produces slug for a string', () => {
    const result = islandtyHelpers.strToSlugWithCounter('Hello World');
    expect(result).toMatch(/^hello-world/);
  });
});

// ============================================================
// parseLinkedAgent — uses real TypedRelators JSON files
// ============================================================
describe('parseLinkedAgent', () => {
  test('parses a single 4-part linked agent value', () => {
    const result = islandtyHelpers.parseLinkedAgent(
      'relators:cre:person:John Doe'
    );
    expect(result).toEqual({
      relators: { Creator: ['John Doe'] },
    });
  });

  test('parses multiple values with same relator type and role', () => {
    // parseLinkedAgent expects pre-split arrays (as produced by transformKeys).
    // Pipe-separated strings are NOT valid input unless already split.
    const result = islandtyHelpers.parseLinkedAgent([
      'relators:aut:person:Jane Austen',
      'relators:aut:person:Charles Dickens',
    ]);
    expect(result.relators).toBeDefined();
    expect(result.relators.Author).toEqual(['Jane Austen', 'Charles Dickens']);
  });

  test('parses values with different relator types', () => {
    const result = islandtyHelpers.parseLinkedAgent([
      'relators:aut:person:Jane Austen',
      'relators:pht:person:Photo Studio',
    ]);
    expect(result.relators.Author).toBeDefined();
    expect(result.relators.Photographer).toBeDefined();
  });

  test('silently skips unknown relator codes', () => {
    const result = islandtyHelpers.parseLinkedAgent(
      'relators:zzz:person:Unknown'
    );
    expect(result).toEqual({});
  });

  test('returns empty object for empty string', () => {
    expect(islandtyHelpers.parseLinkedAgent('')).toEqual({});
  });

  test('returns empty object for empty array', () => {
    expect(islandtyHelpers.parseLinkedAgent([])).toEqual({});
  });

  test('ignores entries with fewer than 4 parts', () => {
    const result = islandtyHelpers.parseLinkedAgent('relators:aut:person');
    expect(result).toEqual({});
  });

  test('silently skips entries with more than 4 parts (names with colons)', () => {
    // The parser splits on ':' and requires exactly 4 parts.
    // Names containing colons produce 5+ parts and are skipped.
    const result = islandtyHelpers.parseLinkedAgent(
      'relators:aut:person:Jane:Austen'
    );
    expect(result).toEqual({});
  });
});

// ============================================================
// linkedAgentUrl
// ============================================================
describe('linkedAgentUrl', () => {
  test('constructs URL from namespace, type, and name', () => {
    const url = islandtyHelpers.linkedAgentUrl(
      'relators',
      'Author',
      'Jane Austen'
    );
    expect(url).toBe('/test-agents/relators/author/jane-austen');
  });
});

// ============================================================
// getParentContent
// ============================================================
describe('getParentContent', () => {
  const items = [
    { id: '1', title: 'Parent' },
    { id: '2', data: { id: '1' }, title: 'Child via data.id' },
  ];

  test('finds parent by matching id', () => {
    const result = islandtyHelpers.getParentContent(items, '1');
    expect(result).toBeTruthy();
    expect(result.title).toBe('Parent');
  });

  test('returns undefined for no match', () => {
    const result = islandtyHelpers.getParentContent([], '999');
    expect(result).toBeUndefined();
  });
});

// ============================================================
// getChildContent
// ============================================================
describe('getChildContent', () => {
  const items = [
    { id: '1', title: 'Parent' },
    { id: '2', parent_id: '1', title: 'Child via parent_id' },
    { id: '3', field_member_of: '1', title: 'Child via field_member_of' },
    { id: '4', data: { parent_id: ['1'] }, title: 'Child via data.parent_id' },
    {
      id: '5',
      data: { field_member_of: ['1'] },
      title: 'Child via data.field_member_of',
    },
    { id: '6', parent_id: '999', title: 'Not a child' },
  ];

  test('finds all children for a given parent', () => {
    const result = islandtyHelpers.getChildContent(items, '1');
    expect(result).toHaveLength(4);
    expect(result.map((c) => c.id).sort()).toEqual(['2', '3', '4', '5']);
  });

  test('handles pipe-separated multi-value parent_id', () => {
    const multiItems = [
      { id: '10', parent_id: '1|2', title: 'Multi-parent child' },
    ];
    const result = islandtyHelpers.getChildContent(multiItems, '1');
    expect(result).toHaveLength(1);
  });

  test('returns empty array when no children match', () => {
    const result = islandtyHelpers.getChildContent(items, '0');
    expect(result).toHaveLength(0);
  });
});

// ============================================================
// getChildPosition — documents the = vs === bug
// ============================================================
describe('getChildPosition', () => {
  test('returns 0 due to assignment bug', () => {
    // src:107 uses = (assign) not === (compare). Every iteration sets
    // childItem.data.id = object.data.id, which is always truthy, so
    // the function returns the first index (0) instead of the correct one.
    // Items must match parent_id so getChildContent returns results.
    const items = [
      { id: 'c1', data: { id: 'p1' }, parent_id: 'px' },
      { id: 'c2', data: { id: 'p2' }, parent_id: 'px' },
      { id: 'c3', data: { id: 'p3' }, parent_id: 'px' },
    ];
    const object = { data: { id: 'p2' } };
    const result = islandtyHelpers.getChildPosition(items, object, 'px');
    expect(result).toBe(0);
  });
});

// ============================================================
// getLayoutForContentModel — uses real filesystem
// ============================================================
describe('getLayoutForContentModel', () => {
  test('returns default layout for null/undefined', () => {
    expect(islandtyHelpers.getLayoutForContentModel(null)).toBe(
      'partials/default-item.html'
    );
    expect(islandtyHelpers.getLayoutForContentModel(undefined)).toBe(
      'partials/default-item.html'
    );
  });

  test('returns layout for a known model', () => {
    // getLayoutForContentModel uses slugify without lower:true,
    // so 'Image' stays as 'Image'. Image.html exists in partials/.
    const result = islandtyHelpers.getLayoutForContentModel('Image');
    expect(result).toBe('partials/Image.html');
  });

  test('falls back to default for unknown model', () => {
    const result = islandtyHelpers.getLayoutForContentModel('NonexistentModel');
    expect(result).toBe('partials/default-item.html');
  });
});

// ============================================================
// getIiifManifestForItem
// ============================================================
describe('getIiifManifestForItem', () => {
  test('constructs manifest path from contentPath and item id', () => {
    const item = { id: '7' };
    expect(islandtyHelpers.getIiifManifestForItem(item)).toBe(
      '/test-content/7/iiif/index.json'
    );
  });
});

// ============================================================
// itemsWithContentModel
// ============================================================
describe('itemsWithContentModel', () => {
  const items = [
    { data: { field_model: 'image' }, title: 'Image 1' },
    { data: { field_model: 'page' }, title: 'Page 1' },
    { data: { field_model: 'image' }, title: 'Image 2' },
  ];

  test('filters items by content model', () => {
    const result = islandtyHelpers.itemsWithContentModel(items, 'image');
    expect(result).toHaveLength(2);
  });

  test('returns empty array when no items match', () => {
    const result = islandtyHelpers.itemsWithContentModel(items, 'audio');
    expect(result).toHaveLength(0);
  });
});

// ============================================================
// itemsWithFieldValue
// ============================================================
describe('itemsWithFieldValue', () => {
  test('filters items by single-cardinality field value', () => {
    const items = [
      { data: { title: 'Alpha' } },
      { data: { title: 'Beta' } },
      { data: { title: 'Alpha' } },
    ];
    const result = islandtyHelpers.itemsWithFieldValue(items, 'title', 'Alpha');
    expect(result).toHaveLength(2);
  });
});

// ============================================================
// objectIndexMetadata
// ============================================================
describe('objectIndexMetadata', () => {
  test('modifies Page model title to include parent title', () => {
    // Parent item must have a .data wrapper (11ty data cascade convention).
    const items = [{ id: 'p', data: { title: 'Parent Title' }, title: 'Parent Title' }];
    const object = {
      data: {
        field_model: 'Page',
        parent_id: 'p',
        title: 'Page Title',
        field_weight: '2',
      },
    };

    const result = islandtyHelpers.objectIndexMetadata(items, object);
    expect(result.data.title).toBe('Page Title – Parent Title');
  });

  test('does not modify non-Page models', () => {
    const object = {
      data: { field_model: 'Image', title: 'Image Title' },
    };

    const result = islandtyHelpers.objectIndexMetadata([], object);
    expect(result.data.title).toBe('Image Title');
  });
});

// ============================================================
// processXSLT — uses real SaxonJS. Test with bogus file paths
// so we get a predictable error path (null return).
// ============================================================
describe('processXSLT', () => {
  test('handles non-existent stylesheet gracefully', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = islandtyHelpers.processXSLT(
      'nonexistent.xml',
      'nonexistent.xsl'
    );
    expect(result).toBeNull();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

// ============================================================
// searchIndexMods
// ============================================================
describe('searchIndexMods', () => {
  test('returns null when ModsFile is missing', () => {
    const article = { data: {} };
    const result = islandtyHelpers.searchIndexMods(article);
    expect(result).toBeNull();
  });

  test('returns null when IndexXSLT is missing', () => {
    const article = { data: { ModsFile: 'mods.xml' } };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = islandtyHelpers.searchIndexMods(article);
    expect(result).toBeNull();
    consoleError.mockRestore();
  });
});

// ============================================================
// transformKeys
// ============================================================
describe('transformKeys', () => {
  test('replaces colons with underscores in keys', () => {
    const obj = { 'field:name:with:colons': 'value', id: '1' };
    const result = islandtyHelpers.transformKeys(obj);
    expect(result.field_name_with_colons).toBe('value');
  });

  test('adds permalink field', () => {
    const obj = { id: '42' };
    const result = islandtyHelpers.transformKeys(obj);
    expect(result.permalink).toBe('/test-content/42/index.html');
  });

  test('adds _label suffix for known fields', () => {
    const obj = { id: '1', title: 'My Title' };
    const result = islandtyHelpers.transformKeys(obj);
    expect(result.title_label).toBeDefined();
  });

  test('puts transformed keys into item sub-object', () => {
    const obj = { id: '1', title: 'Test' };
    const result = islandtyHelpers.transformKeys(obj);
    expect(result.item.id).toBe('1');
    expect(result.item.title).toBe('Test');
  });
});

// ============================================================
// getFileFields / getMetadataFields — use real config files
// ============================================================
describe('getFileFields', () => {
  test('returns file-type fields', () => {
    const fields = islandtyHelpers.getFileFields();
    expect(Array.isArray(fields)).toBe(true);
    expect(fields.length).toBeGreaterThan(0);
    expect(fields).toContain('file');
    expect(fields).toContain('thumbnail');
  });

  test('excludes non-file fields', () => {
    const fields = islandtyHelpers.getFileFields();
    expect(fields).not.toContain('id');
    expect(fields).not.toContain('title');
  });
});

describe('getMetadataFields', () => {
  test('returns fields that are not type file', () => {
    const fields = islandtyHelpers.getMetadataFields();
    expect(Array.isArray(fields)).toBe(true);
    // With the current config, most fields have metadata_display unset
    // or false. Only thumbnail has metadata_display:true but it is type file
    // so it's excluded. Result may be empty — that's the real behavior.
    expect(fields).not.toContain('file');
    expect(fields).not.toContain('thumbnail');
  });
});
