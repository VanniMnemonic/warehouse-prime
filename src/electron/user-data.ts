import { app } from 'electron';
import * as path from 'path';

/**
 * Returns the root directory used to store all application data (DB, images).
 *
 * | Mode      | Value                                          |
 * |-----------|------------------------------------------------|
 * | Portable  | `<exe-dir>/data`  (next to the .exe on a USB)  |
 * | Installed | OS user-data dir  (default Electron behaviour) |
 *
 * electron-builder's portable launcher sets `PORTABLE_EXECUTABLE_DIR` to the
 * directory that contains the running `.exe` before the Electron process starts,
 * so it is safe to read this variable at module-load time (before `app.ready`).
 */
export function getDataPath(): string {
  const portableDir = process.env['PORTABLE_EXECUTABLE_DIR'];
  if (portableDir) {
    return path.join(portableDir, 'data');
  }
  return app.getPath('userData');
}
