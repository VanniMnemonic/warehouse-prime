import path from 'path';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Asset } from './entities/Asset';
import { Batch } from './entities/Batch';
import { Location } from './entities/Location';
import { Note } from './entities/Note';
import { Title } from './entities/Title';
import { User } from './entities/User';
import { Withdrawal } from './entities/Withdrawal';
import { getDataPath } from './user-data';

const dbPath = path.join(getDataPath(), 'prime.sqlite');

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: dbPath,
  synchronize: true,
  logging: false,
  entities: [User, Asset, Batch, Withdrawal, Location, Title, Note],
  migrations: [],
  subscribers: [],
});
