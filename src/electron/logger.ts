import log from 'electron-log/main';
import * as path from 'path';
import { getDataPath } from './user-data';

let initialized = false;

/**
 * One-time logger setup for the Electron main process.
 *
 * Routes log.* calls AND every existing `console.*` call to:
 *   - the dev terminal (level: debug and up)
 *   - `<userData>/logs/main.log` with 5 MB rotation (level: info and up)
 *
 * Safe to call multiple times; only the first call wires things up. Must
 * be called inside / after `app.on('ready', ...)` because the lazy path
 * resolution touches `app.getPath('userData')`.
 */
export function setupLogger(): void {
  if (initialized) return;
  initialized = true;

  log.transports.file.resolvePathFn = () => path.join(getDataPath(), 'logs', 'main.log');
  log.transports.file.maxSize = 5 * 1024 * 1024;
  log.transports.file.level = 'info';
  log.transports.console.level = 'debug';
  log.initialize();

  // Override the global `console` so the existing scattered `console.error`
  // / `console.warn` calls in main.ts and the services land in the rotated
  // file log too — zero refactor required.
  Object.assign(console, log.functions);

  log.info('Logger initialized');
}

export default log;
