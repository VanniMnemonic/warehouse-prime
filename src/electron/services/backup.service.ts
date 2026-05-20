import archiver from 'archiver';
import { dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import unzipper from 'unzipper';
import { AppDataSource } from '../data-source';
import { Asset } from '../entities/Asset';
import { User } from '../entities/User';
import { getDataPath } from '../user-data';

export class BackupService {
  private userDataPath = getDataPath();
  private dbPath = path.join(this.userDataPath, 'prime.sqlite');
  private imagesDir = path.join(this.userDataPath, 'images');

  async exportBackup(): Promise<boolean> {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Backup',
      defaultPath: `prime-backup-${new Date().toISOString().split('T')[0]}.zip`,
      filters: [{ name: 'Zip Files', extensions: ['zip'] }],
    });

    if (!filePath) return false;

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(filePath);
      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      output.on('close', () => resolve(true));
      archive.on('error', (err: any) => reject(err));

      archive.pipe(output);

      // Database file. SQLite may also have -wal / -shm sidecar files if WAL
      // mode is in use; include them so the archive captures a consistent
      // snapshot regardless of journal mode.
      if (fs.existsSync(this.dbPath)) {
        archive.file(this.dbPath, { name: 'prime.sqlite' });
      }
      const walPath = `${this.dbPath}-wal`;
      if (fs.existsSync(walPath)) {
        archive.file(walPath, { name: 'prime.sqlite-wal' });
      }
      const shmPath = `${this.dbPath}-shm`;
      if (fs.existsSync(shmPath)) {
        archive.file(shmPath, { name: 'prime.sqlite-shm' });
      }

      // Images directory
      if (fs.existsSync(this.imagesDir)) {
        archive.directory(this.imagesDir, 'images');
      }

      archive.finalize();
    });
  }

  /**
   * Extract the backup zip and replace the live DB and images directory.
   *
   * IMPORTANT: This MUST be called with the TypeORM DataSource destroyed —
   * otherwise the SQLite file handle is open and the copy fails on Windows
   * (EBUSY) or leaves the renderer talking to the unlinked inode on
   * macOS/Linux. The caller (see `import-backup` IPC handler in main.ts)
   * destroys the DataSource, runs this method, re-initializes the
   * DataSource, then calls `normalizeImagePaths()`.
   */
  async importBackup(): Promise<boolean> {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Import Backup',
      filters: [{ name: 'Zip Files', extensions: ['zip'] }],
      properties: ['openFile'],
    });

    if (!filePaths || filePaths.length === 0) return false;

    const backupPath = filePaths[0];

    const tempExtractPath = path.join(this.userDataPath, 'temp_restore');
    try {
      if (fs.existsSync(tempExtractPath)) {
        fs.rmSync(tempExtractPath, { recursive: true, force: true });
      }
      fs.mkdirSync(tempExtractPath, { recursive: true });

      await fs
        .createReadStream(backupPath)
        .pipe(unzipper.Extract({ path: tempExtractPath }))
        .promise();

      // Restore DB (plus WAL / SHM sidecars if the archive includes them).
      const extractedDbPath = path.join(tempExtractPath, 'prime.sqlite');
      if (fs.existsSync(extractedDbPath)) {
        // Clear any stale journal files belonging to the previous DB so they
        // don't get re-applied to the freshly imported one.
        for (const suffix of ['-wal', '-shm', '-journal']) {
          const stale = `${this.dbPath}${suffix}`;
          if (fs.existsSync(stale)) fs.rmSync(stale, { force: true });
        }
        fs.copyFileSync(extractedDbPath, this.dbPath);

        for (const suffix of ['-wal', '-shm']) {
          const src = path.join(tempExtractPath, `prime.sqlite${suffix}`);
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, `${this.dbPath}${suffix}`);
          }
        }
      }

      // Restore Images. fs.cpSync with recursive copies the contents of the
      // source directory into the destination, creating it if needed and
      // overwriting matching filenames.
      const extractedImagesDir = path.join(tempExtractPath, 'images');
      if (fs.existsSync(extractedImagesDir)) {
        fs.mkdirSync(this.imagesDir, { recursive: true });
        fs.cpSync(extractedImagesDir, this.imagesDir, {
          recursive: true,
          force: true,
        });
      }

      return true;
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    } finally {
      if (fs.existsSync(tempExtractPath)) {
        fs.rmSync(tempExtractPath, { recursive: true, force: true });
      }
    }
  }

  /**
   * Rewrite every `image_path` in `asset` and `user` so it points to this
   * machine's `imagesDir` and uses forward slashes (required by the
   * `local-resource://` protocol handler on Windows). Safe to call any time
   * — it's idempotent.
   *
   * Uses TypeORM repositories (not a raw sqlite3 connection) so it always
   * goes through the same DB file as the rest of the app.
   */
  async normalizeImagePaths(): Promise<void> {
    const normalizedImagesDir = this.imagesDir.split(path.sep).join('/');
    const prefix = `local-resource://${normalizedImagesDir}/`;

    await this.normalizeForEntity(Asset, prefix);
    await this.normalizeForEntity(User, prefix);
  }

  private async normalizeForEntity(
    entity: typeof Asset | typeof User,
    prefix: string,
  ): Promise<void> {
    const repo = AppDataSource.getRepository(entity as any);

    // Volume is small (≤ assets + ≤ users on a single SQLite file); fetch all
    // and filter in JS so we don't have to fight TypeORM's null-handling.
    const rows = (await repo.find()) as Array<{ id: number; image_path?: string | null }>;

    for (const row of rows) {
      const current = row.image_path;
      if (!current) continue;

      const bare = current
        .replace(/^local-resource:\/\//, '')
        .replace(/\\/g, '/');
      const slashIdx = bare.lastIndexOf('/');
      const filename = slashIdx >= 0 ? bare.substring(slashIdx + 1) : bare;
      if (!filename) continue;

      const next = `${prefix}${filename}`;
      if (next !== current) {
        await repo.update(row.id, { image_path: next } as any);
      }
    }
  }
}
