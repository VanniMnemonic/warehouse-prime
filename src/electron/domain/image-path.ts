import * as path from 'path';

// Pure helpers for `local-resource://` URL normalisation. Used by:
//   - `BackupService.normalizeImagePaths` after a backup import, to point
//     every asset/user `image_path` at this machine's images directory.
//   - `delete-asset` (main.ts) when reverse-mapping a stored URL back to
//     a filesystem path so we can rm the file.

const LOCAL_RESOURCE_PREFIX = /^local-resource:\/\//;

/**
 * Extract just the filename from any historical `local-resource://...`
 * URL shape we've ever written, normalising Windows backslashes along
 * the way. Returns null when no filename can be recovered.
 */
export function extractImageFilename(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const bare = stored.replace(LOCAL_RESOURCE_PREFIX, '').replace(/\\/g, '/');
  const slashIdx = bare.lastIndexOf('/');
  const filename = slashIdx >= 0 ? bare.substring(slashIdx + 1) : bare;
  return filename || null;
}

/**
 * Compose a `local-resource://` URL that points at this machine's
 * `imagesDir`. Always emits forward slashes regardless of OS — the
 * custom protocol handler in `main.ts` reassembles drive letters on
 * Windows from URL components.
 */
export function buildLocalResourceUrl(imagesDir: string, filename: string): string {
  const normalizedDir = imagesDir.split(path.sep).join('/');
  return `local-resource://${normalizedDir}/${filename}`;
}
