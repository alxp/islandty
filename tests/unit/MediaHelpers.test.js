const MediaHelpers = require('../../src/islandty/lib/MediaHelpers');

describe('MediaHelpers', () => {
  describe('parseFieldTrack', () => {
    test('parses a valid single entry', () => {
      const result = MediaHelpers.parseFieldTrack('video:caption:en:path/file.vtt');
      expect(result).toEqual({
        video: { caption: { en: ['path/file.vtt'] } },
      });
    });

    test('parses multiple entries with same category, type, and language', () => {
      const result = MediaHelpers.parseFieldTrack(
        'video:caption:en:a.vtt|video:caption:en:b.vtt'
      );
      expect(result).toEqual({
        video: { caption: { en: ['a.vtt', 'b.vtt'] } },
      });
    });

    test('parses entries with different categories', () => {
      const result = MediaHelpers.parseFieldTrack(
        'video:caption:en:a.vtt|audio:desc:en:b.mp3'
      );
      expect(result).toEqual({
        video: { caption: { en: ['a.vtt'] } },
        audio: { desc: { en: ['b.mp3'] } },
      });
    });

    test('parses paths containing colons', () => {
      const result = MediaHelpers.parseFieldTrack(
        'video:caption:en:path:with:colons/file.vtt'
      );
      expect(result).toEqual({
        video: { caption: { en: ['path:with:colons/file.vtt'] } },
      });
    });

    test('throws error for entry with fewer than 4 components', () => {
      expect(() => MediaHelpers.parseFieldTrack('video:caption:en')).toThrow(
        'Invalid field track entry at position 1'
      );
    });

    test('returns empty object for empty string', () => {
      expect(MediaHelpers.parseFieldTrack('')).toEqual({});
    });

    test('returns empty object for null or undefined input', () => {
      expect(MediaHelpers.parseFieldTrack(null)).toEqual({});
      expect(MediaHelpers.parseFieldTrack(undefined)).toEqual({});
    });

    test('throws error for entry with empty component (missing category)', () => {
      expect(() => MediaHelpers.parseFieldTrack(':caption:en:file.vtt')).toThrow(
        'Incomplete field track entry at position 1'
      );
    });
  });

  describe('flattenTrackStructure', () => {
    test('flattens a simple single-file structure', () => {
      const input = { video: { en: ['path/to/video.mp4'] } };
      expect(MediaHelpers.flattenTrackStructure(input)).toEqual({
        'path/to/video.mp4': 'video/en/video.mp4',
      });
    });

    test('flattens a multi-language, multi-type structure', () => {
      const input = {
        video: { en: ['media/v1.mp4'], fr: ['media/v1-fr.mp4'] },
        subtitle: { en: ['media/s1.vtt'] },
      };
      const result = MediaHelpers.flattenTrackStructure(input);
      expect(result).toEqual({
        'media/v1.mp4': 'video/en/v1.mp4',
        'media/v1-fr.mp4': 'video/fr/v1-fr.mp4',
        'media/s1.vtt': 'subtitle/en/s1.vtt',
      });
    });

    test('extracts basename from source path for dest filename', () => {
      const input = { video: { en: ['media/subdir/video.mp4'] } };
      expect(MediaHelpers.flattenTrackStructure(input)).toEqual({
        'media/subdir/video.mp4': 'video/en/video.mp4',
      });
    });

    test('returns empty object for empty input', () => {
      expect(MediaHelpers.flattenTrackStructure({})).toEqual({});
    });

    test('handles deeply nested directory structures', () => {
      const input = {
        media: {
          video: { en: ['src/vid.mp4'] },
        },
      };
      const result = MediaHelpers.flattenTrackStructure(input);
      expect(result).toEqual({
        'src/vid.mp4': 'media/video/en/vid.mp4',
      });
    });
  });

  describe('isDirectoryNode', () => {
    test('returns true for nested object with object values', () => {
      expect(MediaHelpers.isDirectoryNode({ a: { b: {} } })).toBe(true);
    });

    test('returns true when all values are objects (arrays are typeof object)', () => {
      // isDirectoryNode checks !Array.isArray(value) on the top-level value,
      // then checks that Object.values are all typeof 'object'.
      // { a: ['file.txt'] } — the value itself is not an array, its values are.
      // typeof ['file.txt'] === 'object', so it passes the check.
      expect(MediaHelpers.isDirectoryNode({ a: ['file.txt'] })).toBe(true);
    });

    test('returns false for primitive values', () => {
      expect(MediaHelpers.isDirectoryNode('string')).toBe(false);
    });

    test('returns false for null', () => {
      expect(MediaHelpers.isDirectoryNode(null)).toBe(false);
    });

    test('returns false for arrays', () => {
      expect(MediaHelpers.isDirectoryNode(['a', 'b'])).toBe(false);
    });

    test('returns false when a value is a primitive (leaf node)', () => {
      expect(MediaHelpers.isDirectoryNode({ a: 'string-value' })).toBe(false);
    });
  });

  describe('updateTrackField', () => {
    test('updates a track field with a new base path', () => {
      const result = MediaHelpers.updateTrackField(
        'video:caption:en:old/path/file.vtt',
        'new/media'
      );
      expect(result).toBe('video:caption:en:new/media/video/caption/en/file.vtt');
    });

    test('uses only filename from original path', () => {
      const result = MediaHelpers.updateTrackField(
        'video:caption:en:path:with:colons/file.vtt',
        'new'
      );
      expect(result).toBe('video:caption:en:new/video/caption/en/file.vtt');
    });

    test('throws error for track field with fewer than 4 components', () => {
      expect(() =>
        MediaHelpers.updateTrackField('video:caption:en', 'new')
      ).toThrow('Invalid trackField format');
    });
  });
});
