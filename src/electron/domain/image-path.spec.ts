// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildLocalResourceUrl, extractImageFilename } from './image-path';

describe('extractImageFilename', () => {
  it('extracts the filename from a macOS-style URL', () => {
    expect(
      extractImageFilename('local-resource:///Users/alice/images/123-photo.png'),
    ).toBe('123-photo.png');
  });

  it('extracts the filename from a Windows-style URL with a drive letter', () => {
    expect(
      extractImageFilename('local-resource://C:/Users/alice/images/123-photo.png'),
    ).toBe('123-photo.png');
  });

  it('normalises Windows backslashes inside the URL', () => {
    // Belt-and-suspenders: even if a malformed value crept in with
    // backslashes (e.g. from an older release that did not call
    // split(path.sep).join('/') on upload), we still recover.
    expect(
      extractImageFilename('local-resource://C:\\Users\\alice\\images\\123-photo.png'),
    ).toBe('123-photo.png');
  });

  it('returns just the filename when the input is already the bare filename', () => {
    expect(extractImageFilename('photo.png')).toBe('photo.png');
  });

  it('returns null for an empty or missing input', () => {
    expect(extractImageFilename(null)).toBeNull();
    expect(extractImageFilename(undefined)).toBeNull();
    expect(extractImageFilename('')).toBeNull();
  });

  it('returns null when the path ends with a slash (no filename)', () => {
    expect(extractImageFilename('local-resource:///Users/alice/images/')).toBeNull();
  });

  it('handles filenames with spaces and unicode (no URL decoding here -- the protocol handler does that)', () => {
    expect(
      extractImageFilename('local-resource:///Users/alice/images/foto%20cane%20%C3%A8.png'),
    ).toBe('foto%20cane%20%C3%A8.png');
  });
});

describe('buildLocalResourceUrl', () => {
  it('emits forward slashes on a POSIX-style imagesDir', () => {
    expect(buildLocalResourceUrl('/Users/alice/Library/images', 'photo.png')).toBe(
      'local-resource:///Users/alice/Library/images/photo.png',
    );
  });

  it('round-trips with extractImageFilename', () => {
    // The pair must be idempotent: building a URL from the imagesDir and
    // re-extracting the filename must give back the original filename.
    // This is what BackupService relies on to be re-runnable.
    const built = buildLocalResourceUrl('/data/prime/images', '999-file.jpg');
    expect(extractImageFilename(built)).toBe('999-file.jpg');
  });
});
