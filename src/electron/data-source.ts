import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { Asset } from './entities/Asset';
import { Batch } from './entities/Batch';
import { Withdrawal } from './entities/Withdrawal';
import { Location } from './entities/Location';
import { Title } from './entities/Title';
import path from 'path';
import { app } from 'electron';

const dbPath = path.join(app.getPath('userData'), 'prime.sqlite');

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: dbPath,
  synchronize: true,
  logging: false,
  entities: [User, Asset, Batch, Withdrawal, Location, Title],
  migrations: [],
  subscribers: [],
});
