import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import * as path from 'path';
import * as url from 'url';
import * as fs from 'fs';
import sharp from 'sharp';
import 'reflect-metadata';
import { AppDataSource } from './data-source';
import { User } from './entities/User';
import { Title } from './entities/Title';
import { Location } from './entities/Location';
import { Asset } from './entities/Asset';
import { Batch } from './entities/Batch';
import { Withdrawal } from './entities/Withdrawal';
import { In, IsNull } from 'typeorm';
import { NoteService } from './services/note.service';
import { BackupService } from './services/backup.service';

let win: BrowserWindow | null = null;

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

async function startUiServer(distRoot: string) {
  const http = await import('http');
  const server = http.createServer((req, res) => {
    const locale = getLocale();
    const reqUrl = req.url ?? '/';
    const pathname = reqUrl.split('?')[0] ?? '/';

    if (pathname === '/') {
      res.writeHead(302, { Location: `/${locale}/` });
      res.end();
      return;
    }

    const decoded = decodeURIComponent(pathname);
    const normalized = path.posix.normalize(decoded);
    const safePath = normalized.replace(/^(\.\.(\/|\\|$))+/, '');

    const filePath = path.join(distRoot, safePath);
    const resolved = path.resolve(filePath);
    const resolvedRoot = path.resolve(distRoot);
    if (!resolved.startsWith(resolvedRoot)) {
      res.writeHead(403);
      res.end();
      return;
    }

    let finalPath = resolved;
    try {
      const stat = fs.statSync(finalPath);
      if (stat.isDirectory()) {
        finalPath = path.join(finalPath, 'index.html');
      }
    } catch {
      res.writeHead(404);
      res.end();
      return;
    }

    try {
      const data = fs.readFileSync(finalPath);
      res.setHeader('Content-Type', contentTypeForPath(finalPath));
      res.setHeader('Cache-Control', 'no-store');
      res.writeHead(200);
      res.end(data);
    } catch {
      res.writeHead(500);
      res.end();
    }
  });

  return await new Promise<{ server: any; port: number }>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({ server, port });
    });
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Consider contextBridge for production
      backgroundThrottling: false,
      webSecurity: false, // Disabling webSecurity allows loading local resources, but protocol handler is better practice
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

    startUiServer(distRoot).then(({ server, port }) => {
      if (!win) return;
      win.loadURL(`http://127.0.0.1:${port}/${locale}/`);
      win.on('closed', () => {
        try {
          server.close();
        } catch {}
      });
    });
  }

  win.on('closed', () => {
    win = null;
  });
}

app.on('ready', () => {
  // Register 'local-resource' protocol to serve local files
  protocol.registerFileProtocol('local-resource', (request, callback) => {
    const url = request.url.replace('local-resource://', '');
    try {
      return callback(decodeURIComponent(url));
    } catch (error) {
      console.error(error);
      return callback('404');
    }
  });

  try {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'prime.sqlite');
    const clearedMarkerPath = path.join(userDataPath, '.prime-db-cleared');

    if (!fs.existsSync(clearedMarkerPath)) {
      if (fs.existsSync(dbPath)) {
        fs.rmSync(dbPath, { force: true });
      }
      fs.writeFileSync(clearedMarkerPath, '1');
    }
  } catch (error) {
    console.error('Failed to clear database file:', error);
  }

  AppDataSource.initialize().then(async () => {
    console.log('Data Source has been initialized!');

    ipcMain.on('renderer-log', (event, payload) => {
      const level = payload?.level;
      const message = payload?.message;
      const meta = payload?.meta;
      const time = payload?.time;
      if (level === 'error') {
        console.error('[renderer]', time, message, meta ?? '');
      } else if (level === 'warn') {
        console.warn('[renderer]', time, message, meta ?? '');
      } else {
        console.log('[renderer]', time, message, meta ?? '');
      }
    });

    // Handle Notes
    const noteService = new NoteService();

    ipcMain.handle('get-notes', async (event, entityType: string, entityId: number) => {
      return await noteService.getByEntity(entityType, entityId);
    });

    ipcMain.handle('add-note', async (event, note: any) => {
      return await noteService.create(note);
    });

    ipcMain.handle('delete-note', async (event, id: number) => {
      return await noteService.delete(id);
    });

    // Handle Backup
    const backupService = new BackupService();

    ipcMain.handle('export-backup', async () => {
      return await backupService.exportBackup();
    });

    ipcMain.handle('import-backup', async () => {
      return await backupService.importBackup();
    });

    createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('add-location', async (event, locationData: Partial<Location>) => {
  const startedAt = Date.now();
  console.log('[ipc] add-location:start', { locationData });
  try {
    const locationRepository = AppDataSource.getRepository(Location);
    console.log('[ipc] add-location:created repository');
    const location = locationRepository.create(locationData);
    console.log('[ipc] add-location:entity created', {
      denomination: location.denomination,
      parent_id: (location as any).parent_id ?? null,
    });
    const saved = await locationRepository.save(location);
    const elapsedMs = Date.now() - startedAt;
    console.log('[ipc] add-location:done', { elapsedMs, id: saved.id });
    if (elapsedMs > 1500) console.warn(`[ipc] add-location took ${elapsedMs}ms`);
    return {
      id: saved.id,
      denomination: saved.denomination,
      description: saved.description,
      phone: saved.phone,
      parent_id: saved.parent_id ?? null,
    };
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    console.error('[ipc] add-location:error', { elapsedMs, error });
    throw error;
  }
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});

// TypeORM IPC Handlers
ipcMain.handle('get-users', async () => {
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

ipcMain.handle('add-user', async (event, userData: Partial<User>) => {
  const userRepository = AppDataSource.getRepository(User);
  const user = userRepository.create(userData);
  return await userRepository.save(user);
});

ipcMain.handle('update-user', async (event, userData: Partial<User>) => {
  const userRepository = AppDataSource.getRepository(User);
  return await userRepository.save(userData);
});

ipcMain.handle('get-titles', async () => {
  const titleRepository = AppDataSource.getRepository(Title);
  return await titleRepository.find();
});

ipcMain.handle('add-title', async (event, titleData: Partial<Title>) => {
  const titleRepository = AppDataSource.getRepository(Title);
  const title = titleRepository.create(titleData);
  return await titleRepository.save(title);
});

ipcMain.handle('get-locations', async () => {
  const startedAt = Date.now();
  console.log('[ipc] get-locations:start');
  try {
    const locationRepository = AppDataSource.getRepository(Location);
    console.log('[ipc] get-locations:created repository');
    const locations = await locationRepository
      .createQueryBuilder('l')
      .select('l.id', 'id')
      .addSelect('l.denomination', 'denomination')
      .addSelect('l.description', 'description')
      .addSelect('l.phone', 'phone')
      .addSelect('l.parent_id', 'parent_id')
      .orderBy('l.id', 'ASC')
      .getRawMany<{
        id: number;
        denomination: string;
        description: string | null;
        phone: string | null;
        parent_id: number | null;
      }>();
    const elapsedMs = Date.now() - startedAt;
    console.log('[ipc] get-locations:done', { elapsedMs, count: locations.length });
    if (elapsedMs > 1500) console.warn(`[ipc] get-locations took ${elapsedMs}ms`);
    return locations;
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    console.error('[ipc] get-locations:error', { elapsedMs, error });
    throw error;
  }
});

ipcMain.handle('get-withdrawals', async () => {
  const withdrawalRepository = AppDataSource.getRepository(Withdrawal);
  return await withdrawalRepository.find({
    relations: ['user', 'batch', 'batch.asset'],
    order: { date: 'DESC' },
  });
});

ipcMain.handle('get-withdrawals-by-user', async (event, userId: number) => {
  const withdrawalRepository = AppDataSource.getRepository(Withdrawal);
  return await withdrawalRepository.find({
    where: { user_id: userId },
    relations: ['batch', 'batch.asset'],
    order: { date: 'DESC' },
  });
});

ipcMain.handle('upload-image', async (event, filePath: string) => {
  try {
    const userDataPath = app.getPath('userData');
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

    return `local-resource://${destinationPath}`;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
});

ipcMain.handle('get-assets', async () => {
  const startedAt = Date.now();
  const assetRepository = AppDataSource.getRepository(Asset);
  const assets = await assetRepository.find();
  const batchRepository = AppDataSource.getRepository(Batch);
  const withdrawalRepository = AppDataSource.getRepository(Withdrawal);

  const assetIds = assets.map((a) => a.id);
  const batches = assetIds.length
    ? await batchRepository.find({ where: { asset_id: In(assetIds) } })
    : [];

  const batchesByAssetId = new Map<number, Batch[]>();
  for (const batch of batches) {
    const list = batchesByAssetId.get(batch.asset_id) ?? [];
    list.push(batch);
    batchesByAssetId.set(batch.asset_id, list);
  }

  const withdrawnByAsset = await withdrawalRepository
    .createQueryBuilder('w')
    .innerJoin(Batch, 'b', 'b.id = w.batch_id')
    .select('b.asset_id', 'asset_id')
    .addSelect('SUM(w.quantity - w.returned_quantity)', 'withdrawn_quantity')
    .where('w.must_return = :mustReturn', { mustReturn: true })
    .andWhere('w.return_date IS NULL')
    .groupBy('b.asset_id')
    .getRawMany<{ asset_id: number; withdrawn_quantity: string | null }>();

  const withdrawnMap = new Map<number, number>(
    withdrawnByAsset.map((r) => [Number(r.asset_id), Number(r.withdrawn_quantity ?? 0)]),
  );

  const now = new Date();
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const assetsWithDetails = assets.map((asset) => {
    const assetBatches = batchesByAssetId.get(asset.id) ?? [];
    const totalQty = assetBatches.reduce((sum, batch) => sum + batch.quantity, 0);

    const hasExpired = assetBatches.some(
      (b) => b.expiration_date && new Date(b.expiration_date) < now,
    );
    const hasNearExpiry = assetBatches.some((b) => {
      if (!b.expiration_date) return false;
      const exp = new Date(b.expiration_date);
      return exp > now && exp <= thirtyDaysFromNow;
    });

    return {
      ...asset,
      total_quantity: totalQty,
      withdrawn_quantity: withdrawnMap.get(asset.id) ?? 0,
      is_below_min_stock: totalQty < asset.min_stock,
      has_expired_batches: hasExpired,
      has_near_expiry_batches: hasNearExpiry,
    };
  });

  const elapsedMs = Date.now() - startedAt;
  if (elapsedMs > 1500) console.warn(`[ipc] get-assets took ${elapsedMs}ms`);
  return assetsWithDetails;
});

ipcMain.handle('add-asset', async (event, assetData: Partial<Asset>) => {
  const assetRepository = AppDataSource.getRepository(Asset);
  const asset = assetRepository.create(assetData);
  return await assetRepository.save(asset);
});

ipcMain.handle('update-asset', async (event, assetData: Partial<Asset>) => {
  const assetRepository = AppDataSource.getRepository(Asset);
  return await assetRepository.save(assetData);
});

ipcMain.handle('get-batches-by-asset', async (event, assetId: number) => {
  const batchRepository = AppDataSource.getRepository(Batch);
  return await batchRepository.find({
    where: { asset: { id: assetId } },
    relations: ['location', 'location.parent'],
  });
});

ipcMain.handle('add-batch', async (event, batchData: any) => {
  const batchRepository = AppDataSource.getRepository(Batch);
  const batch = batchRepository.create(batchData);
  return await batchRepository.save(batch);
});

ipcMain.handle('update-batch', async (event, batchData: any) => {
  const batchRepository = AppDataSource.getRepository(Batch);
  return await batchRepository.save(batchData);
});

ipcMain.handle('get-batch-by-serial', async (event, serialNumber: string) => {
  const batchRepository = AppDataSource.getRepository(Batch);
  return await batchRepository.findOne({
    where: { serial_number: serialNumber },
    relations: ['asset', 'location'],
  });
});

ipcMain.handle('add-withdrawal', async (event, withdrawalData: any) => {
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

ipcMain.handle(
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

ipcMain.handle('reset-db', async () => {
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

ipcMain.handle('seed-db', async () => {
  await seedDatabase();
  return true;
});
