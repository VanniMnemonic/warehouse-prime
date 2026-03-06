import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as url from 'url';
import 'reflect-metadata';
import { AppDataSource } from './data-source';
import { User } from './entities/User';

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Consider contextBridge for production
      backgroundThrottling: false,
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
  AppDataSource.initialize()
    .then(async () => {
      console.log('Data Source has been initialized!');

      // Seed mock users if empty
      const userRepository = AppDataSource.getRepository(User);
      const count = await userRepository.count();
      if (count === 0) {
        console.log('Seeding mock users...');
        const mockUsers = [
          {
            first_name: 'Mario',
            last_name: 'Rossi',
            email: 'mario.rossi@example.com',
            role: 'admin',
            barcode: 'MR001',
          },
          {
            first_name: 'Luigi',
            last_name: 'Verdi',
            email: 'luigi.verdi@example.com',
            role: 'user',
            barcode: 'LV002',
          },
          {
            first_name: 'Giovanna',
            last_name: 'Bianchi',
            email: 'giovanna.bianchi@example.com',
            role: 'user',
            barcode: 'GB003',
          },
          {
            first_name: 'Anna',
            last_name: 'Neri',
            email: 'anna.neri@example.com',
            role: 'manager',
            barcode: 'AN004',
          },
          {
            first_name: 'Paolo',
            last_name: 'Gialli',
            email: 'paolo.gialli@example.com',
            role: 'user',
            barcode: 'PG005',
          },
        ];

        for (const u of mockUsers) {
          await userRepository.save(userRepository.create(u));
        }
        console.log('Mock users seeded.');
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

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});

// TypeORM IPC Handlers
ipcMain.handle('get-users', async () => {
  const userRepository = AppDataSource.getRepository(User);
  return await userRepository.find();
});

ipcMain.handle('add-user', async (event, userData: Partial<User>) => {
  const userRepository = AppDataSource.getRepository(User);
  const user = userRepository.create(userData);
  return await userRepository.save(user);
});
