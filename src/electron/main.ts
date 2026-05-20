import { app, BrowserWindow, ipcMain, protocol, type IpcMainInvokeEvent } from 'electron';
import { autoUpdater, type ProgressInfo, type UpdateInfo } from 'electron-updater';
import * as fs from 'fs';
import * as path from 'path';
import 'reflect-metadata';
import sharp from 'sharp';
import { Between, In, IsNull, LessThan } from 'typeorm';
import { AppDataSource } from './data-source';
import { Asset } from './entities/Asset';
import { Batch } from './entities/Batch';
import { Location } from './entities/Location';
import { Note } from './entities/Note';
import { Title } from './entities/Title';
import { User } from './entities/User';
import { Withdrawal } from './entities/Withdrawal';
import { BackupService } from './services/backup.service';
import { NoteService } from './services/note.service';
import { getDataPath } from './user-data';
import { EXPIRY_WARNING_DAYS } from './constants';
import { setupLogger } from './logger';
import { bootstrapDatabase } from './bootstrap-db';

// Must be called before app.ready so the 'app' scheme is treated as a
// standard secure origin.  Without this, <script type="module"> tags and
// fetch() calls inside the renderer are blocked by Chromium's security model.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,   // enables relative URL resolution (base href, etc.)
      secure: true,     // treated as HTTPS-equivalent (allows ES modules)
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
  {
    scheme: 'local-resource',
    privileges: {
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true,
    },
  },
]);

let win: BrowserWindow | null = null;

type UpdateState = {
  supported: boolean;
  status: 'idle' | 'checking' | 'available' | 'not_available' | 'downloading' | 'downloaded' | 'error';
  lastCheckedAt?: string;
  info?: { version: string; releaseName?: string; releaseDate?: string } | null;
  progress?: { percent: number; transferred: number; total: number } | null;
  error?: string | null;
};

const updateState: UpdateState = {
  supported: false,
  status: 'idle',
  info: null,
  progress: null,
  error: null,
};

function isDevMode(): boolean {
  return process.argv.includes('--dev') || process.env['NODE_ENV'] === 'development';
}

function isUpdaterSupported(): boolean {
  return app.isPackaged && !isDevMode();
}

// Wrapper around `ipcMain.handle` that logs the channel name when the
// handler rejects. The original error is re-thrown unchanged so the
// renderer still sees the same rejection message (no `[ipc] X failed:`
// prefix leaks into the user-facing toast). Replaces the previous
// pattern where many handlers had no outer try/catch and errors
// reached the renderer as opaque rejections with no breadcrumb.
function handleIpc(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: any[]) => unknown,
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (err) {
      console.error(`[ipc] ${channel} failed:`, err);
      throw err;
    }
  });
}

function toMinimalUpdateInfo(info: UpdateInfo): UpdateState['info'] {
  return {
    version: info.version,
    releaseName: info.releaseName ?? undefined,
    releaseDate: info.releaseDate ?? undefined,
  };
}

let updaterInitialized = false;
function initAutoUpdater() {
  updateState.supported = isUpdaterSupported();
  if (!updateState.supported || updaterInitialized) return;
  updaterInitialized = true;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    updateState.status = 'checking';
    updateState.error = null;
    updateState.progress = null;
  });

  autoUpdater.on('update-available', (info) => {
    updateState.status = 'available';
    updateState.info = toMinimalUpdateInfo(info);
    updateState.error = null;
  });

  autoUpdater.on('update-not-available', (info) => {
    updateState.status = 'not_available';
    updateState.info = toMinimalUpdateInfo(info);
    updateState.error = null;
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    updateState.status = 'downloading';
    updateState.progress = {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    };
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateState.status = 'downloaded';
    updateState.info = toMinimalUpdateInfo(info);
    updateState.error = null;
    updateState.progress = null;
  });

  autoUpdater.on('error', (err) => {
    updateState.status = 'error';
    updateState.error = err instanceof Error ? err.message : String(err);
  });
}

async function seedDatabase() {
  const titleRepository = AppDataSource.getRepository(Title);
  const locationRepository = AppDataSource.getRepository(Location);
  const userRepository = AppDataSource.getRepository(User);
  const assetRepository = AppDataSource.getRepository(Asset);
  const batchRepository = AppDataSource.getRepository(Batch);
  const withdrawalRepository = AppDataSource.getRepository(Withdrawal);

  const titleCount = await titleRepository.count();
  if (titleCount === 0) {
    const titleNames = ['Mr.', 'Mrs.', 'Dr.', 'Prof.', 'Ms.'];
    for (const name of titleNames) {
      const t = new Title();
      t.title = name;
      await titleRepository.save(t);
    }
  }

  const locationCount = await locationRepository.count();
  if (locationCount === 0) {
    const root = new Location();
    root.denomination = 'Root';
    root.description = 'Root Location';
    await locationRepository.save(root);
  }

  const titles = await titleRepository.find();
  const locations = await locationRepository.find();

  const userCount = await userRepository.count();
  if (userCount === 0 && titles.length && locations.length) {
    const u = new User();
    u.first_name = 'Mario';
    u.last_name = 'Rossi';
    u.email = 'mario.rossi@example.com';
    u.barcode = 'MR001';
    u.title = titles[0];
    u.location = locations[0];
    await userRepository.save(u);
  }

  const assetCount = await assetRepository.count();
  if (assetCount === 0 && locations.length) {
    const asset = new Asset();
    asset.denomination = 'Laptop Dell XPS 15';
    asset.part_number = 'DELL-XPS-15';
    asset.min_stock = 5;
    asset.barcode = `AST-${Math.floor(1000 + Math.random() * 9000)}`;
    const savedAsset = await assetRepository.save(asset);

    const batch = new Batch();
    batch.denomination = `Batch 1 - ${savedAsset.denomination}`;
    batch.asset = savedAsset;
    batch.serial_number = `SN-${savedAsset.part_number}-${Date.now()}-0`;
    batch.quantity = 10;
    batch.location = locations[0];
    const savedBatch = await batchRepository.save(batch);

    const users = await userRepository.find();
    if (users.length) {
      const withdrawal = new Withdrawal();
      withdrawal.user = users[0];
      withdrawal.batch = savedBatch;
      withdrawal.quantity = 1;
      withdrawal.date = new Date();
      withdrawal.must_return = false;
      await withdrawalRepository.save(withdrawal);
    }
  }
}

function getArgValue(name: string): string | undefined {
  const prefix = `${name}=`;
  const raw = process.argv.find((a) => a.startsWith(prefix));
  return raw ? raw.slice(prefix.length) : undefined;
}

function getLocale(): string {
  const lang = getArgValue('--lang') ?? getArgValue('--locale');
  if (!lang) return 'it';
  return lang.startsWith('it') ? 'it' : 'en-US';
}

function contentTypeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.ico':
      return 'image/x-icon';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    case '.ttf':
      return 'font/ttf';
    case '.eot':
      return 'application/vnd.ms-fontobject';
    default:
      return 'application/octet-stream';
  }
}



function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Strict renderer isolation: the renderer cannot `require` Node
      // modules. The bridged surface is what `src/electron/preload.js`
      // exposes via contextBridge (window.electron.invoke + getFilePath).
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // preload still needs Node (contextBridge, ipcRenderer)
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
      // webSecurity stays on the default `true`. Local resources are
      // served via the `app://` and `local-resource://` custom protocols
      // registered with `secure: true` above, so same-origin enforcement
      // does not get in the way.
    },
  });

  const isDev = process.argv.includes('--dev') || process.env['NODE_ENV'] === 'development';
  const ui = getArgValue('--ui');

  if (isDev) {
    const uiPath = ui ?? '/';
    win.loadURL(`http://localhost:4200${uiPath}`);
    win.webContents.openDevTools();
  } else {
    const locale = getLocale();
    const distRoot = path.join(app.getAppPath(), 'dist', 'prime', 'browser');
    const hasLocalizedUi = fs.existsSync(path.join(distRoot, locale, 'index.html'));
    const entryPath = hasLocalizedUi ? `app://app/${locale}/` : `app://app/`;
    win.loadURL(entryPath);
  }

  win.on('closed', () => {
    win = null;
  });
}

app.on('ready', () => {
  setupLogger();
  initAutoUpdater();

  // Serve the Angular build output via the 'app://' scheme.
  // Using protocol.handle (instead of a custom HTTP server) means Electron
  // resolves paths inside the ASAR archive natively, which fixes 404 errors
  // for .js files on Windows where the HTTP-server + ASAR combo was unreliable.
  const appDistRoot = path.join(app.getAppPath(), 'dist', 'prime', 'browser');
  protocol.handle('app', (request) => {
    try {
      const { pathname } = new URL(request.url);
      const decoded = decodeURIComponent(pathname);

      // Resolve to an absolute path and guard against directory traversal.
      const resolved = path.normalize(path.join(appDistRoot, decoded));
      const rootWithSep = appDistRoot.endsWith(path.sep)
        ? appDistRoot
        : appDistRoot + path.sep;
      if (!resolved.startsWith(rootWithSep) && resolved !== appDistRoot) {
        return new Response('Forbidden', { status: 403 });
      }

      let filePath = resolved;
      let stat: fs.Stats;
      try {
        stat = fs.statSync(filePath);
      } catch {
        return new Response('Not Found', { status: 404 });
      }

      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      const data = fs.readFileSync(filePath);
      return new Response(data, {
        headers: { 'content-type': contentTypeForPath(filePath) },
      });
    } catch (err) {
      console.error('app:// protocol error:', err);
      return new Response('Internal Server Error', { status: 500 });
    }
  });

  // Register 'local-resource' protocol to serve local files from the userData
  // directory. We use protocol.handle (Fetch-based API) instead of the
  // deprecated registerFileProtocol so that it works correctly on all
  // platforms, including Windows.
  //
  // The key Windows problem with registerFileProtocol was that Chromium parses
  // `local-resource://C:/path/file.png` as { host: 'c', pathname: '/path/file.png' }
  // treating the drive letter as the URL host and silently dropping it.
  // By registering the scheme as privileged (non-standard) above and
  // reconstructing the path from both host and pathname we recover the full
  // drive-letter path on Windows while remaining correct on macOS/Linux.
  // Sandbox `local-resource://` strictly to <userData>/images/. Without this
  // guard a renderer (which runs with nodeIntegration: true) could craft a URL
  // like `local-resource:///etc/passwd` and read arbitrary files via fetch().
  // The `app://` handler above has the equivalent guard; keep them aligned.
  const localResourceRoot = path.join(getDataPath(), 'images');
  const localResourceRootWithSep = localResourceRoot.endsWith(path.sep)
    ? localResourceRoot
    : localResourceRoot + path.sep;

  protocol.handle('local-resource', (request) => {
    try {
      const parsed = new URL(request.url);
      // On Windows, the drive letter ends up as `parsed.host` (e.g. "c")
      // and the rest of the path is in `parsed.pathname` (e.g. "/Users/...").
      // On macOS/Linux, host is empty and pathname holds the full path.
      const hostPart = parsed.host ? parsed.host + ':' : '';
      const filePath = path.normalize(
        decodeURIComponent(hostPart + parsed.pathname),
      );

      if (filePath !== localResourceRoot && !filePath.startsWith(localResourceRootWithSep)) {
        return new Response('Forbidden', { status: 403 });
      }

      if (!fs.existsSync(filePath)) {
        return new Response('Not Found', { status: 404 });
      }

      const data = fs.readFileSync(filePath);
      return new Response(data, {
        headers: { 'content-type': contentTypeForPath(filePath) },
      });
    } catch (error) {
      console.error('local-resource protocol error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  });

  try {
    // Ensure the data directory exists (important for first run in portable mode).
    // The DB file itself is opened by TypeORM (see data-source.ts); we don't
    // delete it here -- removing the previous `.prime-db-cleared` first-run
    // wipe so installed copies preserve user data across upgrades.
    fs.mkdirSync(getDataPath(), { recursive: true });
  } catch (error) {
    console.error('Failed to ensure user data directory:', error);
  }

  handleIpc('get-app-version', () => {
    return app.getVersion();
  });

  handleIpc('get-update-status', () => {
    updateState.supported = isUpdaterSupported();
    return { ...updateState };
  });

  handleIpc('check-for-updates', async () => {
    initAutoUpdater();
    if (!updateState.supported) return { ...updateState };
    if (updateState.status === 'checking') return { ...updateState };

    updateState.lastCheckedAt = new Date().toISOString();
    updateState.status = 'checking';
    updateState.error = null;
    updateState.progress = null;

    try {
      const result = await autoUpdater.checkForUpdates();
      updateState.info = result?.updateInfo ? toMinimalUpdateInfo(result.updateInfo) : updateState.info;
    } catch (err) {
      updateState.status = 'error';
      updateState.error = err instanceof Error ? err.message : String(err);
    }

    return { ...updateState };
  });

  handleIpc('download-update', async () => {
    initAutoUpdater();
    if (!updateState.supported) return false;
    if (updateState.status !== 'available' && updateState.status !== 'downloading') return false;

    try {
      updateState.status = 'downloading';
      await autoUpdater.downloadUpdate();
      return true;
    } catch (err) {
      updateState.status = 'error';
      updateState.error = err instanceof Error ? err.message : String(err);
      return false;
    }
  });

  handleIpc('quit-and-install-update', () => {
    initAutoUpdater();
    if (!updateState.supported) return false;
    if (updateState.status !== 'downloaded') return false;
    autoUpdater.quitAndInstall();
    return true;
  });

  AppDataSource.initialize().then(async () => {
    console.log('Data Source has been initialized!');
    await bootstrapDatabase();

    // Handle Notes
    const noteService = new NoteService();

    handleIpc('get-notes', async (event, entityType: string, entityId: number) => {
      return await noteService.getByEntity(entityType, entityId);
    });

    handleIpc('add-note', async (event, note: any) => {
      return await noteService.create(note);
    });

    handleIpc('delete-note', async (event, id: number) => {
      return await noteService.delete(id);
    });

    // Handle Backup
    const backupService = new BackupService();

    handleIpc('export-backup', async () => {
      return await backupService.exportBackup();
    });

    // Import flow:
    //   1. Destroy the TypeORM DataSource so the SQLite file handle is
    //      released — otherwise the copy fails on Windows (EBUSY) and on
    //      macOS/Linux the connection keeps pointing at the old inode after
    //      the file is replaced.
    //   2. Run the file-level restore (DB + images).
    //   3. Re-initialize the DataSource on the freshly imported DB file.
    //   4. Run `bootstrapDatabase()` so the imported DB is brought to the
    //      current entity shape: if it came from a pre-1.0 synchronize-era
    //      backup it gets baselined; if it came from a 1.0+ backup any
    //      schema migrations that this app has but the backup did not
    //      run are applied here.
    //   5. Rewrite asset/user image_path values so they point to *this*
    //      machine's imagesDir (idempotent — safe to re-run).
    // If the restore is cancelled by the user (file dialog dismissed) we
    // still re-initialize so the app remains usable.
    handleIpc('import-backup', async () => {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }

      let restored = false;
      try {
        restored = await backupService.importBackup();
      } catch (err) {
        if (!AppDataSource.isInitialized) {
          await AppDataSource.initialize().catch((reinitErr) => {
            console.error('Failed to reinitialize DataSource after import error:', reinitErr);
          });
          await bootstrapDatabase().catch((bootErr) => {
            console.error('Failed to bootstrap DataSource after import error:', bootErr);
          });
        }
        throw err;
      }

      await AppDataSource.initialize();
      await bootstrapDatabase();

      if (restored) {
        await backupService.normalizeImagePaths();
      }

      return restored;
    });

    createWindow();

    if (updateState.supported) {
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch(() => { });
      }, 2500);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

handleIpc('add-location', async (event, locationData: Partial<Location>) => {
  const startedAt = Date.now();
  const locationRepository = AppDataSource.getRepository(Location);
  const parentId = (locationData.parent_id ?? null) as number | null;
  let sortOrder = locationData.sort_order;
  if (sortOrder === undefined || sortOrder === null) {
    const raw = await locationRepository
      .createQueryBuilder('l')
      .select('MAX(l.sort_order)', 'max')
      .where(parentId === null ? 'l.parent_id IS NULL' : 'l.parent_id = :parentId', { parentId })
      .getRawOne<{ max: string | null }>();
    sortOrder = Number(raw?.max ?? 0) + 1;
  }

  const location = locationRepository.create({ ...locationData, sort_order: sortOrder });
  const saved = await locationRepository.save(location);
  const elapsedMs = Date.now() - startedAt;
  if (elapsedMs > 1500) console.warn(`[ipc] add-location took ${elapsedMs}ms`);
  return {
    id: saved.id,
    denomination: saved.denomination,
    description: saved.description,
    phone: saved.phone,
    parent_id: saved.parent_id ?? null,
    sort_order: saved.sort_order ?? 0,
  };
});

handleIpc('update-location', async (event, locationData: Partial<Location>) => {
  const locationRepository = AppDataSource.getRepository(Location);
  const saved = await locationRepository.save(locationData);
  return {
    id: saved.id,
    denomination: saved.denomination,
    description: saved.description,
    phone: saved.phone,
    parent_id: saved.parent_id ?? null,
    sort_order: saved.sort_order ?? 0,
  };
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});

// TypeORM IPC Handlers
handleIpc('get-users', async () => {
  const startedAt = Date.now();
  const userRepository = AppDataSource.getRepository(User);
  const users = await userRepository.find({
    relations: [
      'title',
      'location',
      'location.parent',
      'location.parent.parent',
      'location.parent.parent.parent',
    ],
  });

  const withdrawalRepository = AppDataSource.getRepository(Withdrawal);
  const activeCounts = await withdrawalRepository
    .createQueryBuilder('w')
    .select('w.user_id', 'user_id')
    .addSelect('COUNT(*)', 'count')
    .where('w.must_return = :mustReturn', { mustReturn: true })
    .andWhere('w.return_date IS NULL')
    .groupBy('w.user_id')
    .getRawMany<{ user_id: number; count: string }>();

  const activeCountByUserId = new Map<number, number>(
    activeCounts.map((r) => [Number(r.user_id), Number(r.count)]),
  );

  const usersWithCount = users.map((user) => ({
    ...user,
    active_withdrawals: activeCountByUserId.get(user.id) ?? 0,
  }));

  const elapsedMs = Date.now() - startedAt;
  if (elapsedMs > 1500) console.warn(`[ipc] get-users took ${elapsedMs}ms`);
  return usersWithCount;
});

handleIpc('add-user', async (event, userData: Partial<User>) => {
  const userRepository = AppDataSource.getRepository(User);
  const user = userRepository.create(userData);
  return await userRepository.save(user);
});

handleIpc('update-user', async (event, userData: Partial<User>) => {
  const userRepository = AppDataSource.getRepository(User);
  return await userRepository.save(userData);
});

handleIpc('get-titles', async () => {
  const titleRepository = AppDataSource.getRepository(Title);
  return await titleRepository.find();
});

handleIpc('add-title', async (event, titleData: Partial<Title>) => {
  const titleRepository = AppDataSource.getRepository(Title);
  const title = titleRepository.create(titleData);
  return await titleRepository.save(title);
});

handleIpc('get-locations', async () => {
  const startedAt = Date.now();
  const locationRepository = AppDataSource.getRepository(Location);
  const locations = await locationRepository
    .createQueryBuilder('l')
    .select('l.id', 'id')
    .addSelect('l.denomination', 'denomination')
    .addSelect('l.description', 'description')
    .addSelect('l.phone', 'phone')
    .addSelect('l.parent_id', 'parent_id')
    .addSelect('l.sort_order', 'sort_order')
    .orderBy('l.parent_id', 'ASC')
    .addOrderBy('l.sort_order', 'ASC')
    .addOrderBy('l.id', 'ASC')
    .getRawMany<{
      id: number;
      denomination: string;
      description: string | null;
      phone: string | null;
      parent_id: number | null;
      sort_order: number | null;
    }>();
  const elapsedMs = Date.now() - startedAt;
  if (elapsedMs > 1500) console.warn(`[ipc] get-locations took ${elapsedMs}ms`);
  return locations;
});

handleIpc(
  'update-locations-hierarchy',
  async (
    event,
    updates: Array<{ id: number; parent_id: number | null; sort_order: number }>,
  ) => {
    const startedAt = Date.now();
    await AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Location);
      const payload = updates.map((u) => ({
        id: u.id,
        parent_id: u.parent_id ?? null,
        sort_order: u.sort_order ?? 0,
      }));
      await repo.save(payload as any);
    });
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs > 500)
      console.warn(
        `[ipc] update-locations-hierarchy updated ${updates.length} row(s) in ${elapsedMs}ms`,
      );
    return true;
  },
);

handleIpc('get-withdrawals', async () => {
  const withdrawalRepository = AppDataSource.getRepository(Withdrawal);
  return await withdrawalRepository.find({
    relations: ['user', 'batch', 'batch.asset'],
    order: { date: 'DESC' },
  });
});

handleIpc('get-withdrawals-overdue', async () => {
  const withdrawalRepository = AppDataSource.getRepository(Withdrawal);
  const now = new Date();
  return await withdrawalRepository.find({
    where: {
      must_return: true,
      return_date: IsNull(),
      expected_return_date: LessThan(now),
    },
    relations: ['user', 'batch', 'batch.asset'],
    order: { expected_return_date: 'ASC' },
  });
});

handleIpc('get-withdrawals-by-user', async (event, userId: number) => {
  const withdrawalRepository = AppDataSource.getRepository(Withdrawal);
  return await withdrawalRepository.find({
    where: { user_id: userId },
    relations: ['user', 'batch', 'batch.asset'],
    order: { date: 'DESC' },
  });
});

handleIpc('get-withdrawals-by-asset', async (event, assetId: number) => {
  const withdrawalRepository = AppDataSource.getRepository(Withdrawal);
  return await withdrawalRepository.find({
    where: { batch: { asset_id: assetId } },
    relations: ['user', 'batch', 'batch.asset'],
    order: { date: 'DESC' },
  });
});

handleIpc('upload-image', async (event, filePath: string) => {
  try {
    const userDataPath = getDataPath();
    const imagesDir = path.join(userDataPath, 'images');

    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${path.basename(filePath)}`;
    const destinationPath = path.join(imagesDir, fileName);

    await sharp(filePath)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center',
      })
      .toFile(destinationPath);

    // Always use forward slashes in the URL regardless of OS.
    // On Windows, path.join() returns backslash-separated paths which produce
    // an invalid URL and break the custom protocol handler in the renderer.
    const urlPath = destinationPath.split(path.sep).join('/');
    return `local-resource://${urlPath}`;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
});

// Returns every asset with its aggregated batch totals, active-withdrawal
// count, and the expired / near-expiry flags computed entirely in SQL. One
// query, no per-asset JS loop over the batch array.
handleIpc('get-assets', async () => {
  const startedAt = Date.now();

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() + EXPIRY_WARNING_DAYS);

  // SQLite stores Date columns as ISO 8601 text; comparing as strings is
  // chronologically correct in that format.
  const nowIso = now.toISOString();
  const cutoffIso = cutoff.toISOString();

  type Row = {
    id: number;
    denomination: string;
    part_number: string | null;
    barcode: string | null;
    min_stock: number;
    image_path: string | null;
    total_quantity: number | null;
    inefficient_quantity: number | null;
    withdrawn_quantity: number | null;
    has_expired_batches: number;
    has_near_expiry_batches: number;
  };

  const rows = await AppDataSource.query<Row[]>(
    `
    SELECT
      a.id              AS id,
      a.denomination    AS denomination,
      a.part_number     AS part_number,
      a.barcode         AS barcode,
      a.min_stock       AS min_stock,
      a.image_path      AS image_path,
      COALESCE(SUM(b.quantity), 0)              AS total_quantity,
      COALESCE(SUM(b.inefficient_quantity), 0)  AS inefficient_quantity,
      COALESCE(w.withdrawn_quantity, 0)         AS withdrawn_quantity,
      MAX(CASE
        WHEN b.expiration_date IS NOT NULL AND b.expiration_date < ?
        THEN 1 ELSE 0
      END) AS has_expired_batches,
      MAX(CASE
        WHEN b.expiration_date IS NOT NULL
         AND b.expiration_date > ?
         AND b.expiration_date <= ?
        THEN 1 ELSE 0
      END) AS has_near_expiry_batches
    FROM asset a
    LEFT JOIN batch b ON b.asset_id = a.id
    LEFT JOIN (
      SELECT b2.asset_id AS asset_id,
             SUM(w2.quantity - w2.returned_quantity) AS withdrawn_quantity
        FROM withdrawal w2
        INNER JOIN batch b2 ON b2.id = w2.batch_id
       WHERE w2.must_return = 1 AND w2.return_date IS NULL
       GROUP BY b2.asset_id
    ) w ON w.asset_id = a.id
    GROUP BY a.id
    `,
    [nowIso, nowIso, cutoffIso],
  );

  const assetsWithDetails = rows.map((row) => ({
    id: row.id,
    denomination: row.denomination,
    part_number: row.part_number,
    barcode: row.barcode,
    min_stock: row.min_stock,
    image_path: row.image_path,
    total_quantity: Number(row.total_quantity ?? 0),
    inefficient_quantity: Number(row.inefficient_quantity ?? 0),
    withdrawn_quantity: Number(row.withdrawn_quantity ?? 0),
    is_below_min_stock: Number(row.total_quantity ?? 0) < row.min_stock,
    has_expired_batches: !!row.has_expired_batches,
    has_near_expiry_batches: !!row.has_near_expiry_batches,
  }));

  const elapsedMs = Date.now() - startedAt;
  if (elapsedMs > 1500) console.warn(`[ipc] get-assets took ${elapsedMs}ms`);
  return assetsWithDetails;
});

handleIpc('add-asset', async (event, assetData: Partial<Asset>) => {
  const assetRepository = AppDataSource.getRepository(Asset);
  const asset = assetRepository.create(assetData);
  return await assetRepository.save(asset);
});

handleIpc('update-asset', async (event, assetData: Partial<Asset>) => {
  const assetRepository = AppDataSource.getRepository(Asset);
  return await assetRepository.save(assetData);
});

// Delete an asset and everything that hangs off it. Refuses if any withdrawal
// against one of the asset's batches is still pending (must_return && !return_date)
// — losing an open audit trail would corrupt the active-withdrawals count
// shown on the users list. The image file on disk is removed best-effort
// after the DB transaction commits.
handleIpc('delete-asset', async (event, assetId: number) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  let assetImagePath: string | undefined;

  try {
    const assetRepo = queryRunner.manager.getRepository(Asset);
    const batchRepo = queryRunner.manager.getRepository(Batch);
    const withdrawalRepo = queryRunner.manager.getRepository(Withdrawal);
    const noteRepo = queryRunner.manager.getRepository(Note);

    const asset = await assetRepo.findOne({ where: { id: assetId } });
    if (!asset) {
      throw new Error('Asset not found');
    }
    assetImagePath = asset.image_path;

    const batches = await batchRepo.find({ where: { asset_id: assetId } });
    const batchIds = batches.map((b) => b.id);

    if (batchIds.length > 0) {
      const activeCount = await withdrawalRepo.count({
        where: {
          batch_id: In(batchIds),
          must_return: true,
          return_date: IsNull(),
        },
      });
      if (activeCount > 0) {
        throw new Error(
          `Cannot delete asset: ${activeCount} active withdrawal(s) must be returned first`,
        );
      }
    }

    await queryRunner.startTransaction();
    try {
      const withdrawalsForAsset = batchIds.length
        ? await withdrawalRepo.find({
            where: { batch_id: In(batchIds) },
            select: ['id'],
          })
        : [];
      const withdrawalIds = withdrawalsForAsset.map((w) => w.id);

      if (withdrawalIds.length > 0) {
        await noteRepo.delete({ withdrawal_id: In(withdrawalIds) });
      }
      if (batchIds.length > 0) {
        await noteRepo.delete({ batch_id: In(batchIds) });
      }
      await noteRepo.delete({ asset_id: assetId });

      if (batchIds.length > 0) {
        await withdrawalRepo.delete({ batch_id: In(batchIds) });
      }
      if (batchIds.length > 0) {
        await batchRepo.delete({ asset_id: assetId });
      }
      await assetRepo.delete(assetId);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    }
  } finally {
    await queryRunner.release();
  }

  // Best-effort image cleanup. We restrict deletion to files inside the
  // managed images directory so a malformed image_path can never delete
  // an arbitrary file on disk.
  if (assetImagePath) {
    try {
      const bare = assetImagePath.replace(/^local-resource:\/\//, '');
      const filePath = path.normalize(decodeURIComponent(bare));
      const imagesDir = path.join(getDataPath(), 'images');
      const imagesDirWithSep = imagesDir.endsWith(path.sep) ? imagesDir : imagesDir + path.sep;
      if (filePath.startsWith(imagesDirWithSep) && fs.existsSync(filePath)) {
        fs.rmSync(filePath, { force: true });
      }
    } catch (e) {
      console.warn('Failed to delete asset image file:', e);
    }
  }

  return true;
});

handleIpc('get-batches-by-asset', async (event, assetId: number) => {
  const batchRepository = AppDataSource.getRepository(Batch);
  return await batchRepository.find({
    where: { asset: { id: assetId } },
    relations: ['location', 'location.parent'],
  });
});

handleIpc('get-batches-by-location', async (event, locationId: number) => {
  const batchRepository = AppDataSource.getRepository(Batch);
  return await batchRepository.find({
    where: { location: { id: locationId } },
    relations: ['asset', 'location', 'location.parent'],
    order: { id: 'ASC' },
  });
});

handleIpc('get-batches-expiring-within-days', async (event, days: number) => {
  const batchRepository = AppDataSource.getRepository(Batch);
  const now = new Date();
  const until = new Date(now);
  until.setDate(now.getDate() + Math.max(0, Number(days) || 0));
  return await batchRepository.find({
    where: { expiration_date: Between(now, until) },
    relations: ['asset', 'location', 'location.parent'],
    order: { expiration_date: 'ASC' },
  });
});

handleIpc('get-batches-expired', async () => {
  const batchRepository = AppDataSource.getRepository(Batch);
  const now = new Date();
  return await batchRepository.find({
    where: { expiration_date: LessThan(now) },
    relations: ['asset', 'location', 'location.parent'],
    order: { expiration_date: 'DESC' },
  });
});

handleIpc('add-batch', async (event, batchData: any) => {
  const batchRepository = AppDataSource.getRepository(Batch);
  const batch = batchRepository.create(batchData);
  return await batchRepository.save(batch);
});

handleIpc('update-batch', async (event, batchData: any) => {
  const batchRepository = AppDataSource.getRepository(Batch);
  return await batchRepository.save(batchData);
});

handleIpc('get-batch-by-serial', async (event, serialNumber: string) => {
  const batchRepository = AppDataSource.getRepository(Batch);
  return await batchRepository.findOne({
    where: { serial_number: serialNumber },
    relations: ['asset', 'location'],
  });
});

handleIpc('add-withdrawal', async (event, withdrawalData: any) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const { asset, batch, quantity, user, date, must_return, expected_return_date } =
      withdrawalData;

    let remainingQuantity = quantity;
    const withdrawals = [];

    // Strategy:
    // 1. If 'batch' is provided, try to fulfill from that batch first (specific serial number scan).
    // 2. If 'asset' is provided (and 'batch' might be null or insufficient), fulfill from multiple batches of that asset.
    //    Prioritize batches by expiration_date (nearest first).
    //    Filter out expired batches? The prompt says "if below not expired total", implying we should check expiration.
    //    Actually, "drop first from the ones with nearest expiration_date".

    const batchesToUse: Batch[] = [];

    if (batch) {
      // Specific batch requested
      const existingBatch = await queryRunner.manager.findOne(Batch, { where: { id: batch.id } });
      if (!existingBatch) throw new Error('Batch not found');
      batchesToUse.push(existingBatch);
    } else if (asset) {
      // Asset requested, find best batches
      const availableBatches = await queryRunner.manager.find(Batch, {
        where: { asset: { id: asset.id } },
        order: { expiration_date: 'ASC' }, // Nearest expiration first
      });

      // Filter out batches with 0 quantity
      // Also potentially filter out expired batches if required, but usually we want to use them up or flag them.
      // Prompt says: "if below not expired total". This implies we should only count non-expired stock?
      // Or maybe it means "withdraw as long as we have non-expired stock".
      // Let's filter out strictly expired batches for now to be safe, or just use what's available.
      // Usually, you can't withdraw expired goods for use.
      const now = new Date();
      const validBatches = availableBatches.filter(
        (b) => b.quantity > 0 && (!b.expiration_date || new Date(b.expiration_date) >= now),
      );

      batchesToUse.push(...validBatches);
    } else {
      throw new Error('Neither Asset nor Batch provided');
    }

    for (const currentBatch of batchesToUse) {
      if (remainingQuantity <= 0) break;

      const take = Math.min(currentBatch.quantity, remainingQuantity);

      if (take > 0) {
        currentBatch.quantity -= take;
        await queryRunner.manager.save(currentBatch);

        const withdrawal = new Withdrawal();
        withdrawal.user = user;
        withdrawal.batch = currentBatch;
        withdrawal.quantity = take;
        withdrawal.date = new Date(date);
        withdrawal.must_return = must_return;
        withdrawal.expected_return_date = expected_return_date
          ? new Date(expected_return_date)
          : undefined;
        withdrawal.return_date = undefined;
        withdrawal.inefficient_quantity = 0;

        const savedWithdrawal = await queryRunner.manager.save(withdrawal);
        withdrawals.push(savedWithdrawal);

        remainingQuantity -= take;
      }
    }

    if (remainingQuantity > 0) {
      // If we couldn't fulfill the total request
      throw new Error(`Insufficient quantity. Could not fulfill ${remainingQuantity} of request.`);
    }

    await queryRunner.commitTransaction();
    return withdrawals;
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
});

handleIpc(
  'return-withdrawal',
  async (event, { id, date, returnedQuantity, inefficientQuantity }) => {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const withdrawalRepository = queryRunner.manager.getRepository(Withdrawal);
      const withdrawal = await withdrawalRepository.findOne({
        where: { id },
        relations: ['batch'],
      });

      if (!withdrawal) {
        throw new Error('Withdrawal not found');
      }

      if (withdrawal.return_date) {
        throw new Error('Withdrawal already returned');
      }

      const currentReturned = withdrawal.returned_quantity || 0;
      const remaining = withdrawal.quantity - currentReturned;

      if (returnedQuantity > remaining) {
        throw new Error('Returned quantity exceeds remaining withdrawn quantity');
      }

      if (inefficientQuantity > returnedQuantity) {
        throw new Error('Inefficient quantity cannot exceed returned quantity');
      }

      // Update returned quantity
      withdrawal.returned_quantity = currentReturned + returnedQuantity;
      withdrawal.inefficient_quantity =
        (withdrawal.inefficient_quantity || 0) + inefficientQuantity;

      // If fully returned, set return_date
      if (withdrawal.returned_quantity >= withdrawal.quantity) {
        withdrawal.return_date = new Date(date);
      }

      await queryRunner.manager.save(withdrawal);

      // Increment batch quantity and inefficient quantity
      const batch = withdrawal.batch;
      if (batch) {
        batch.quantity += returnedQuantity;
        batch.inefficient_quantity = (batch.inefficient_quantity || 0) + inefficientQuantity;
        await queryRunner.manager.save(batch);
      }

      await queryRunner.commitTransaction();
      return withdrawal;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  },
);

handleIpc('force-return-withdrawal', async (event, { id, date, returnedQuantity }) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const withdrawalRepository = queryRunner.manager.getRepository(Withdrawal);
    const withdrawal = await withdrawalRepository.findOne({
      where: { id },
      relations: ['batch'],
    });

    if (!withdrawal) {
      throw new Error('Withdrawal not found');
    }

    if (withdrawal.return_date) {
      throw new Error('Withdrawal already returned');
    }

    const sourceBatch = withdrawal.batch;
    if (!sourceBatch) {
      throw new Error('Withdrawal batch not found');
    }

    if (withdrawal.must_return) {
      throw new Error('Withdrawal must be returned using the standard return flow');
    }

    const groupWithdrawals = await withdrawalRepository.find({
      where: {
        user_id: withdrawal.user_id,
        must_return: false,
        return_date: IsNull(),
        date: withdrawal.date,
        batch: { asset_id: sourceBatch.asset_id },
      },
      relations: ['batch'],
    });

    const pickValue = (b: Batch) => {
      if (!b.expiration_date) return Number.MAX_SAFE_INTEGER;
      return new Date(b.expiration_date).getTime();
    };

    groupWithdrawals.sort((a, b) => pickValue(b.batch) - pickValue(a.batch));

    const returnDate = new Date(date);
    let remainingToReturn = returnedQuantity;

    for (const w of groupWithdrawals) {
      if (remainingToReturn <= 0) break;

      const alreadyReturned = w.returned_quantity || 0;
      const remainingForWithdrawal = w.quantity - alreadyReturned;
      if (remainingForWithdrawal <= 0) continue;

      const take = Math.min(remainingForWithdrawal, remainingToReturn);
      w.returned_quantity = alreadyReturned + take;
      if (w.returned_quantity >= w.quantity) {
        w.return_date = returnDate;
      }
      await queryRunner.manager.save(w);

      const batch = w.batch;
      if (!batch) {
        throw new Error('Withdrawal batch not found');
      }
      batch.quantity += take;
      await queryRunner.manager.save(batch);

      remainingToReturn -= take;
    }

    if (remainingToReturn > 0) {
      throw new Error('Returned quantity exceeds remaining withdrawn quantity');
    }

    await queryRunner.commitTransaction();
    return (
      (await withdrawalRepository.findOne({
        where: { id },
        relations: ['batch'],
      })) ?? withdrawal
    );
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
});

handleIpc('reset-db', async () => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  // Disable foreign keys to allow truncating tables
  await queryRunner.query('PRAGMA foreign_keys = OFF');

  try {
    await queryRunner.startTransaction();

    // Clear all tables
    await queryRunner.query('DELETE FROM withdrawal');
    await queryRunner.query('DELETE FROM batch');
    await queryRunner.query('DELETE FROM asset');
    await queryRunner.query('DELETE FROM user');
    await queryRunner.query('DELETE FROM location');
    await queryRunner.query('DELETE FROM title');

    // Reset auto-increment counters (sqlite specific)
    await queryRunner.query('DELETE FROM sqlite_sequence');

    await queryRunner.commitTransaction();
    return true;
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.query('PRAGMA foreign_keys = ON');
    await queryRunner.release();
  }
});

handleIpc('seed-db', async () => {
  await seedDatabase();
  return true;
});
