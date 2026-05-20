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

// `synchronize` is OFF on purpose. Schema lifecycle goes through
// `bootstrapDatabase()` (see `bootstrap-db.ts`):
//   - first launch: synchronize() is invoked once to materialise the
//     schema from entities, then every migration registered below is
//     marked as already applied (baseline).
//   - subsequent launches: `runMigrations()` applies any new entries
//     in the migrations array.
// Add new schema changes by appending a migration file under
// `./migrations/` and importing it into the array below.
export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: dbPath,
  synchronize: false,
  migrationsRun: false,
  logging: false,
  entities: [User, Asset, Batch, Withdrawal, Location, Title, Note],
  migrations: [],
  subscribers: [],
});
