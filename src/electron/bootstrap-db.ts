import { AppDataSource } from './data-source';
import log from './logger';

/**
 * Bring the SQLite schema in line with the running app, exactly once per
 * launch. Must be called AFTER `AppDataSource.initialize()`.
 *
 * Two paths:
 *
 *   - **Missing migrations table.** Either this is a brand-new install or
 *     an existing user upgrading from the synchronize-era pre-1.0 build.
 *     Either way we call `synchronize()` (idempotent if the schema
 *     already matches the entity decorators) and then INSERT every
 *     registered migration into the migrations table without running it.
 *     Result: the DB is at the current entity definition and treated as
 *     if it had already executed every known migration.
 *
 *   - **Migrations table exists.** Normal subsequent launch (or backup
 *     import of a 1.0+ DB). Just run any pending migrations.
 *
 * Used both at boot (main.ts `app.on('ready', ...)`) and after a backup
 * import (`import-backup` IPC handler), because the imported DB may be
 * from an older app version that needs to be brought forward.
 */
export async function bootstrapDatabase(): Promise<void> {
  const queryRunner = AppDataSource.createQueryRunner();
  const migrationsTable = AppDataSource.options.migrationsTableName ?? 'migrations';

  try {
    const migrationsTableExists = await queryRunner.hasTable(migrationsTable);

    if (!migrationsTableExists) {
      // synchronize() applies the current entity shape. For a fresh
      // install this creates everything from zero; for a synchronize-era
      // DB it's a no-op (or applies any drift). The call is safe either
      // way.
      await AppDataSource.synchronize();

      await queryRunner.query(
        `CREATE TABLE IF NOT EXISTS "${migrationsTable}" (
          "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          "timestamp" bigint NOT NULL,
          "name" varchar NOT NULL
        )`,
      );

      // Record every known migration as already applied, since their
      // effect is already baked into the schema we just synchronised.
      // The convention `NameTimestamp` lets us recover the timestamp
      // from the class name -- TypeORM does the same internally.
      for (const migration of AppDataSource.migrations) {
        const className = migration.constructor.name;
        const timestamp = Number(className.match(/\d+$/)?.[0] ?? Date.now());
        await queryRunner.query(
          `INSERT INTO "${migrationsTable}" ("timestamp", "name") VALUES (?, ?)`,
          [timestamp, className],
        );
      }

      log.info(
        `Database bootstrapped (baselined ${AppDataSource.migrations.length} migration(s))`,
      );
      return;
    }

    // Normal start: apply anything new.
    const applied = await AppDataSource.runMigrations();
    if (applied.length > 0) {
      log.info(
        `Applied ${applied.length} migration(s): ${applied.map((m) => m.name).join(', ')}`,
      );
    }
  } finally {
    await queryRunner.release();
  }
}
