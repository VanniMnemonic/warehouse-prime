import archiver from 'archiver';
import { dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { Database } from 'sqlite3';
import unzipper from 'unzipper';
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

      // Add database file
      if (fs.existsSync(this.dbPath)) {
        archive.file(this.dbPath, { name: 'prime.sqlite' });
      }

      // Add images directory
      if (fs.existsSync(this.imagesDir)) {
        archive.directory(this.imagesDir, 'images');
      }

      archive.finalize();
    });
  }

  async importBackup(): Promise<boolean> {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Import Backup',
      filters: [{ name: 'Zip Files', extensions: ['zip'] }],
      properties: ['openFile'],
    });

    if (!filePaths || filePaths.length === 0) return false;

    const backupPath = filePaths[0];

    try {
      // Ensure temp extraction directory exists
      const tempExtractPath = path.join(this.userDataPath, 'temp_restore');
      if (fs.existsSync(tempExtractPath)) {
        fs.rmSync(tempExtractPath, { recursive: true, force: true });
      }
      fs.mkdirSync(tempExtractPath);

      // Extract zip
      await fs
        .createReadStream(backupPath)
        .pipe(unzipper.Extract({ path: tempExtractPath }))
        .promise();

      // Restore DB
      const extractedDbPath = path.join(tempExtractPath, 'prime.sqlite');
      if (fs.existsSync(extractedDbPath)) {
        // Close DB connection if possible?
        // In a real app we might need to close the TypeORM connection first or ensure no locks.
        // For SQLite, replacing the file while app is running might be risky but often works if no active transaction.
        // Ideally we should tell the renderer to block UI and maybe restart app after import.
        fs.copyFileSync(extractedDbPath, this.dbPath);
      }

      // Restore Images
      const extractedImagesDir = path.join(tempExtractPath, 'images');
      if (fs.existsSync(extractedImagesDir)) {
        if (!fs.existsSync(this.imagesDir)) {
          fs.mkdirSync(this.imagesDir);
        }
        // Copy recursive
        fs.cpSync(extractedImagesDir, this.imagesDir, { recursive: true, force: true });
      }

      // Rewrite image_path values to point to the current machine's imagesDir.
      // The restored DB may contain absolute paths from a different machine or
      // OS user account, and will always need forward-slash URLs.
      await this.normalizeImagePaths();

      // Cleanup
      fs.rmSync(tempExtractPath, { recursive: true, force: true });

      return true;
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }

  /**
   * Rewrites every `image_path` value in the `asset` and `user` tables so that
   * it points to the current machine's images directory and uses forward slashes
   * in the `local-resource://` URL (required on Windows).
   *
   * This is called after a backup restore so that images display correctly even
   * when the backup was created on a different machine or OS user account.
   */
  private normalizeImagePaths(): Promise<void> {
    // Always use forward slashes inside URLs regardless of OS
    const normalizedImagesDir = this.imagesDir.split(path.sep).join('/');

    return new Promise<void>((resolve, reject) => {
      const db = new Database(this.dbPath, (openErr) => {
        if (openErr) {
          reject(openErr);
          return;
        }
      });

      const fixTable = (table: string): Promise<void> =>
        new Promise<void>((res, rej) => {
          db.all(
            `SELECT id, image_path FROM "${table}" WHERE image_path IS NOT NULL AND image_path != ''`,
            (err, rows: Array<{ id: number; image_path: string }>) => {
              if (err) {
                rej(err);
                return;
              }

              const updates = rows.map(
                (row) =>
                  new Promise<void>((rs, rj) => {
                    // Extract the bare filename from whatever absolute path was stored,
                    // handling both forward and back slash separators.
                    const bare = row.image_path
                      .replace(/^local-resource:\/\//, '')
                      .replace(/\\/g, '/');
                    const filename = bare.substring(bare.lastIndexOf('/') + 1);

                    if (!filename) {
                      rs();
                      return;
                    }

                    const newPath = `local-resource://${normalizedImagesDir}/${filename}`;
                    db.run(
                      `UPDATE "${table}" SET image_path = ? WHERE id = ?`,
                      [newPath, row.id],
                      (updateErr) => (updateErr ? rj(updateErr) : rs()),
                    );
                  }),
              );

              Promise.all(updates)
                .then(() => res())
                .catch(rej);
            },
          );
        });

      Promise.all([fixTable('asset'), fixTable('user')])
        .then(() => {
          db.close();
          resolve();
        })
        .catch((err) => {
          db.close();
          reject(err);
        });
    });
  }
}
