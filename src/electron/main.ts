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
import { IsNull } from 'typeorm';

let win: BrowserWindow | null = null;

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

  if (isDev) {
    win.loadURL('http://localhost:4200');
    win.webContents.openDevTools();
  } else {
    // Fallback to dev url for now or load dist file
    win.loadURL('http://localhost:4200');
    /*
    win.loadURL(
      url.format({
        pathname: path.join(__dirname, '../../dist/prime/browser/index.html'),
        protocol: 'file:',
        slashes: true,
      })
    );
    */
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

  AppDataSource.initialize()
    .then(async () => {
      console.log('Data Source has been initialized!');

      // Seed Titles
      const titleRepository = AppDataSource.getRepository(Title);
      const titleCount = await titleRepository.count();
      let titles: Title[] = [];
      if (titleCount === 0) {
        console.log('Seeding titles...');
        const titleNames = ['Mr.', 'Mrs.', 'Dr.', 'Prof.', 'Ms.'];
        for (const name of titleNames) {
          const t = new Title();
          t.title = name;
          titles.push(await titleRepository.save(t));
        }
        console.log('Titles seeded.');
      } else {
        titles = await titleRepository.find();
      }

      // Seed Locations (Hierarchy: Complex > Building > Section > Office)
      const locationRepository = AppDataSource.getRepository(Location);
      const locationCount = await locationRepository.count();
      let locations: Location[] = [];

      if (locationCount === 0) {
        console.log('Seeding locations...');
        // Complex
        const complex = new Location();
        complex.denomination = 'Headquarters';
        complex.description = 'Main Corporate Headquarters';
        complex.phone = '+1 555-0100';
        await locationRepository.save(complex);

        // Building A
        const buildingA = new Location();
        buildingA.denomination = 'Building A';
        buildingA.description = 'Administrative Building';
        buildingA.parent = complex;
        await locationRepository.save(buildingA);

        // Building A - Ground Floor
        const groundFloorA = new Location();
        groundFloorA.denomination = 'Ground Floor';
        groundFloorA.description = 'Reception and Security';
        groundFloorA.parent = buildingA;
        await locationRepository.save(groundFloorA);

        // Building A - Ground Floor - Reception
        const reception = new Location();
        reception.denomination = 'Reception';
        reception.description = 'Main Entrance';
        reception.phone = '+1 555-0101';
        reception.parent = groundFloorA;
        locations.push(await locationRepository.save(reception));

        // Building A - Ground Floor - Security
        const security = new Location();
        security.denomination = 'Security Office';
        security.description = 'Security Control Room';
        security.phone = '+1 555-0102';
        security.parent = groundFloorA;
        locations.push(await locationRepository.save(security));

        // Building A - 1st Floor
        const firstFloorA = new Location();
        firstFloorA.denomination = '1st Floor';
        firstFloorA.description = 'Departments Floor';
        firstFloorA.parent = buildingA;
        await locationRepository.save(firstFloorA);

        // Building A - 1st Floor - HR
        const hr = new Location();
        hr.denomination = 'HR Department';
        hr.description = 'Human Resources';
        hr.phone = '+1 555-0103';
        hr.parent = firstFloorA;
        locations.push(await locationRepository.save(hr));

        // Building A - 1st Floor - IT
        const it = new Location();
        it.denomination = 'IT Support';
        it.description = 'Information Technology';
        it.phone = '+1 555-0104';
        it.parent = firstFloorA;
        locations.push(await locationRepository.save(it));

        // Building B
        const buildingB = new Location();
        buildingB.denomination = 'Building B';
        buildingB.description = 'Logistics Center';
        buildingB.parent = complex;
        await locationRepository.save(buildingB);

        // Building B - Warehouse
        const warehouse = new Location();
        warehouse.denomination = 'Warehouse';
        warehouse.description = 'Main Storage';
        warehouse.parent = buildingB;
        await locationRepository.save(warehouse);

        // Building B - Warehouse - Logistics
        const logistics = new Location();
        logistics.denomination = 'Logistics Office';
        logistics.description = 'Shipping and Receiving';
        logistics.phone = '+1 555-0105';
        logistics.parent = warehouse;
        locations.push(await locationRepository.save(logistics));

        console.log('Locations seeded.');
      } else {
        // Fetch all leaf locations (those without children, assuming for now we just pick some known ones or all)
        // For simplicity in this mock update, let's just grab all locations and pick random ones
        locations = await locationRepository.find();
      }

      // Seed mock users if empty
      const userRepository = AppDataSource.getRepository(User);
      const count = await userRepository.count();
      if (count === 0) {
        console.log('Seeding mock users...');

        // Helper to get random location from our seeded list
        const getRandomLocation = () => locations[Math.floor(Math.random() * locations.length)];

        const mockUsers = [
          {
            first_name: 'Mario',
            last_name: 'Rossi',
            email: 'mario.rossi@example.com',
            role: 'admin',
            barcode: 'MR001',
            title: titles[0], // Mr.
            location: locations.find((l) => l.denomination === 'IT Support') || getRandomLocation(),
          },
          {
            first_name: 'Luigi',
            last_name: 'Verdi',
            email: 'luigi.verdi@example.com',
            role: 'user',
            barcode: 'LV002',
            title: titles[0], // Mr.
            location:
              locations.find((l) => l.denomination === 'Logistics Office') || getRandomLocation(),
          },
          {
            first_name: 'Giovanna',
            last_name: 'Bianchi',
            email: 'giovanna.bianchi@example.com',
            role: 'user',
            barcode: 'GB003',
            title: titles[1], // Mrs.
            location:
              locations.find((l) => l.denomination === 'HR Department') || getRandomLocation(),
          },
          {
            first_name: 'Anna',
            last_name: 'Neri',
            email: 'anna.neri@example.com',
            role: 'manager',
            barcode: 'AN004',
            title: titles[1], // Mrs.
            location: locations.find((l) => l.denomination === 'Reception') || getRandomLocation(),
          },
          {
            first_name: 'Paolo',
            last_name: 'Gialli',
            email: 'paolo.gialli@example.com',
            role: 'user',
            barcode: 'PG005',
            title: titles[0], // Mr.
            location:
              locations.find((l) => l.denomination === 'Security Office') || getRandomLocation(),
          },
        ];

        for (const u of mockUsers) {
          await userRepository.save(userRepository.create(u));
        }
        console.log('Mock users seeded.');
      } else {
        // Update existing users if they are missing title or location
        const users = await userRepository.find({ relations: ['title', 'location'] });

        const mockUserLocations: Record<string, string> = {
          'mario.rossi@example.com': 'IT Support',
          'luigi.verdi@example.com': 'Logistics Office',
          'giovanna.bianchi@example.com': 'HR Department',
          'anna.neri@example.com': 'Reception',
          'paolo.gialli@example.com': 'Security Office',
        };

        for (const user of users) {
          let updated = false;
          if (!user.title && titles.length > 0) {
            user.title = titles[Math.floor(Math.random() * titles.length)];
            updated = true;
          }

          // Force update location for known mock users
          if (mockUserLocations[user.email]) {
            const targetLoc = locations.find(
              (l) => l.denomination === mockUserLocations[user.email],
            );
            if (targetLoc && (!user.location || user.location.id !== targetLoc.id)) {
              user.location = targetLoc;
              updated = true;
            }
          } else if (!user.location && locations.length > 0) {
            user.location = locations[Math.floor(Math.random() * locations.length)];
            updated = true;
          }

          if (updated) {
            await userRepository.save(user);
          }
        }
        console.log('Existing users updated with mock data.');
      }

      // Seed Assets and Batches
      const assetRepository = AppDataSource.getRepository(Asset);
      const batchRepository = AppDataSource.getRepository(Batch);
      const withdrawalRepository = AppDataSource.getRepository(Withdrawal);
      const assetCount = await assetRepository.count();

      let createdBatches: Batch[] = [];

      if (assetCount === 0 && locations.length > 0) {
        console.log('Seeding assets and batches...');

        const assetsData = [
          { denomination: 'Laptop Dell XPS 15', part_number: 'DELL-XPS-15', min_stock: 5 },
          { denomination: 'Monitor Samsung 27"', part_number: 'SAM-27-MON', min_stock: 10 },
          { denomination: 'Ergonomic Chair', part_number: 'ERGO-CHAIR-V1', min_stock: 20 },
          { denomination: 'Office Desk', part_number: 'DESK-STD-120', min_stock: 15 },
          { denomination: 'Keyboard Logitech MX', part_number: 'LOGI-MX-KEYS', min_stock: 8 },
          { denomination: 'Mouse Logitech MX Master', part_number: 'LOGI-MX-MOUSE', min_stock: 8 },
          { denomination: 'Printer HP LaserJet', part_number: 'HP-LASER-PRO', min_stock: 2 },
          { denomination: 'Projector Epson', part_number: 'EPSON-PROJ-4K', min_stock: 1 },
          { denomination: 'Whiteboard', part_number: 'WB-180x120', min_stock: 3 },
          { denomination: 'Coffee Machine', part_number: 'NESPRESSO-PRO', min_stock: 1 },
          // Test items
          { denomination: 'Expired Milk', part_number: 'MILK-EXP', min_stock: 10 },
          { denomination: 'Near Expiry Bread', part_number: 'BREAD-SOON', min_stock: 10 },
          { denomination: 'Low Stock Pens', part_number: 'PEN-LOW', min_stock: 100 },
        ];

        for (const data of assetsData) {
          const asset = new Asset();
          asset.denomination = data.denomination;
          asset.part_number = data.part_number;
          asset.min_stock = data.min_stock;
          // Generate a pseudo-random barcode
          asset.barcode = `AST-${Math.floor(1000 + Math.random() * 9000)}`;

          const savedAsset = await assetRepository.save(asset);

          // Specific logic for test items
          if (data.part_number === 'MILK-EXP') {
            const batch = new Batch();
            batch.denomination = `Batch 1 - Expired`;
            batch.asset = savedAsset;
            batch.serial_number = `SN-EXP-001`;
            batch.quantity = 20;
            const date = new Date();
            date.setDate(date.getDate() - 10); // 10 days ago
            batch.expiration_date = date;
            batch.location = locations[0];
            createdBatches.push(await batchRepository.save(batch));
            continue;
          }

          if (data.part_number === 'BREAD-SOON') {
            const batch = new Batch();
            batch.denomination = `Batch 1 - Near Expiry`;
            batch.asset = savedAsset;
            batch.serial_number = `SN-NEAR-001`;
            batch.quantity = 20;
            const date = new Date();
            date.setDate(date.getDate() + 5); // In 5 days
            batch.expiration_date = date;
            batch.location = locations[0];
            createdBatches.push(await batchRepository.save(batch));
            continue;
          }

          if (data.part_number === 'PEN-LOW') {
            const batch = new Batch();
            batch.denomination = `Batch 1 - Low Stock`;
            batch.asset = savedAsset;
            batch.serial_number = `SN-LOW-001`;
            batch.quantity = 5; // Below min_stock of 100
            batch.location = locations[0];
            createdBatches.push(await batchRepository.save(batch));
            continue;
          }

          // Create batches for each asset
          const numBatches = Math.floor(Math.random() * 3) + 1; // 1 to 3 batches per asset

          for (let i = 0; i < numBatches; i++) {
            const batch = new Batch();
            batch.denomination = `Batch ${i + 1} - ${savedAsset.denomination}`;
            batch.asset = savedAsset;
            batch.serial_number = `SN-${savedAsset.part_number}-${Date.now()}-${i}`;

            // Random quantity
            batch.quantity = Math.floor(Math.random() * 50) + 1;
            batch.inefficient_quantity = Math.floor(Math.random() * 5);

            // Random expiration date for some
            if (Math.random() > 0.7) {
              const date = new Date();
              date.setFullYear(date.getFullYear() + 1);
              batch.expiration_date = date;
            }

            // Assign to a random location
            batch.location = locations[Math.floor(Math.random() * locations.length)];

            const savedBatch = await batchRepository.save(batch);
            createdBatches.push(savedBatch);
          }
        }
        console.log('Assets and batches seeded.');
      } else {
        createdBatches = await batchRepository.find();
      }

      // Seed Withdrawals
      const withdrawalCount = await withdrawalRepository.count();
      if (withdrawalCount === 0 && createdBatches.length > 0) {
        console.log('Seeding withdrawals...');
        const users = await userRepository.find();

        // Create 20 random withdrawals
        for (let i = 0; i < 20; i++) {
          const withdrawal = new Withdrawal();

          // Random user
          withdrawal.user = users[Math.floor(Math.random() * users.length)];

          // Random batch
          withdrawal.batch = createdBatches[Math.floor(Math.random() * createdBatches.length)];

          // Random quantity (1 to 5)
          withdrawal.quantity = Math.floor(Math.random() * 5) + 1;

          // Random inefficient quantity (0 to 1)
          withdrawal.inefficient_quantity = Math.random() > 0.8 ? 1 : 0;

          // Random date within the last 30 days
          const date = new Date();
          date.setDate(date.getDate() - Math.floor(Math.random() * 30));
          withdrawal.date = date;

          // Random must_return
          withdrawal.must_return = Math.random() > 0.5;

          // If must_return is true, maybe set a return date (50% chance)
          if (withdrawal.must_return && Math.random() > 0.5) {
            const returnDate = new Date(date);
            returnDate.setDate(returnDate.getDate() + Math.floor(Math.random() * 7) + 1); // Returned 1-7 days later
            withdrawal.return_date = returnDate;
          }

          await withdrawalRepository.save(withdrawal);
        }
        console.log('Withdrawals seeded.');
      }

      createWindow();
    })
    .catch((err) => {
      console.error('Error during Data Source initialization', err);
    });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('add-location', async (event, locationData: Partial<Location>) => {
  const locationRepository = AppDataSource.getRepository(Location);
  const location = locationRepository.create(locationData);
  return await locationRepository.save(location);
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});

// TypeORM IPC Handlers
ipcMain.handle('get-users', async () => {
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
  const usersWithCount = await Promise.all(
    users.map(async (user) => {
      const count = await withdrawalRepository.count({
        where: { user: { id: user.id }, must_return: true, return_date: IsNull() },
      });
      return { ...user, active_withdrawals: count };
    }),
  );

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
  const locationRepository = AppDataSource.getRepository(Location);
  return await locationRepository.find({
    relations: ['parent'],
  });
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
  const assetRepository = AppDataSource.getRepository(Asset);
  const assets = await assetRepository.find();
  const batchRepository = AppDataSource.getRepository(Batch);

  const assetsWithDetails = await Promise.all(
    assets.map(async (asset) => {
      const batches = await batchRepository.find({ where: { asset: { id: asset.id } } });
      const totalQty = batches.reduce((sum, batch) => sum + batch.quantity, 0);

      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      const hasExpired = batches.some(
        (b) => b.expiration_date && new Date(b.expiration_date) < now,
      );
      const hasNearExpiry = batches.some((b) => {
        if (!b.expiration_date) return false;
        const exp = new Date(b.expiration_date);
        return exp > now && exp <= thirtyDaysFromNow;
      });

      return {
        ...asset,
        total_quantity: totalQty,
        is_below_min_stock: totalQty < asset.min_stock,
        has_expired_batches: hasExpired,
        has_near_expiry_batches: hasNearExpiry,
      };
    }),
  );

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
