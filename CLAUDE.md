# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Angular/TypeScript coding conventions live in `.claude/CLAUDE.md` and are
> loaded automatically. This file covers what isn't obvious from a quick
> directory scan: commands, the Electron↔Angular split, and the IPC contract.

## Commands

```bash
# Web dev (browser only, no Electron)
npm start                     # ng serve on :4200

# Electron dev (concurrent ng serve + Electron window)
npm run electron:dev          # English UI
npm run electron:dev:it       # Italian UI (uses --localize build)

# Tests (Vitest via @angular/build:unit-test)
npm test                      # ng test, watch mode
npm test -- --run             # single run
# Single test file: pass --include to vitest after `--`
npm test -- --run --include 'src/app/users/users.spec.ts'

# Build
npm run build                 # production Angular bundle → dist/prime/browser
npm run build:localize        # same, but emits both /en-US and /it
npm run build:electron        # tsc -p tsconfig.electron.json → dist-electron

# Package desktop apps (each runs build:localize + build:electron + electron-builder)
npm run dist:mac              # → release/*.dmg
npm run dist:win              # → release/*.exe (portable)
npm run dist:linux            # → release/*.AppImage

# i18n
npm run extract-i18n          # refresh src/locale/messages.xlf from source strings
```

## Architecture

Two TypeScript compilation contexts in one repo, glued by Electron IPC:

```
┌─────────────────────────┐         ipcRenderer.invoke           ┌──────────────────────────┐
│ Angular 21 (renderer)   │ ───────────────────────────────────► │ Electron main process    │
│ src/app/                │                                      │ src/electron/            │
│ tsconfig.app.json       │                                      │ tsconfig.electron.json   │
│ Built by @angular/build │ ◄─────────────────────────────────── │ tsc → dist-electron/     │
│ → dist/prime/browser    │              return value            │ + TypeORM/sqlite3        │
└─────────────────────────┘                                      └──────────────────────────┘
```

### Renderer side (`src/app/`)

- Standard Angular 21 SPA with PrimeNG + Tailwind v4. Routes in
  `app.routes.ts` are all under the `Home` shell (a sidebar + outlet).
- **All data flows through `ElectronService.invoke(channel, ...args)`**
  (`src/app/services/electron.ts`). Each feature has a thin
  `*.service.ts` that wraps `invoke('<channel-name>', payload)` — never
  call `ipcRenderer` directly from components.
- The wrapper hops responses back into Angular's zone with
  `NgZone.run()` — without that, signals/views don't update.
- When `isElectron()` is false (e.g. plain `ng serve` in a browser tab
  with no Electron host), `invoke` returns `null`. Services that call
  it must tolerate `null` / use `?? []` for list endpoints — the
  pattern is already established in `user.service.ts`.

### Main side (`src/electron/`)

- `main.entry.js` is the actual Electron entry point — it
  `ts-node`-registers `tsconfig.electron.json` and then requires
  `main.ts`. The `tsconfig.electron.json` targets CommonJS, which is
  required for TypeORM decorators + Electron's Node runtime.
- `main.ts` registers every `ipcMain.handle(<channel>, ...)`. The
  channel name is the contract — adding a new feature means: add the
  handler in `main.ts`, add a wrapper method in the matching
  `src/app/services/<feature>.service.ts`, call it from the component.
- `data-source.ts` configures TypeORM with **`synchronize: true`**.
  There are no migrations — the schema is rebuilt from entity
  decorators on every start. Entities live in
  `src/electron/entities/` (User, Asset, Batch, Withdrawal, Location,
  Title, Note). Changing a column shape may silently drop or alter
  data on next launch — assume the local sqlite is throwaway.
- The DB file lives at `<userData>/prime.sqlite` in installed mode, or
  `<exe-dir>/data/prime.sqlite` in portable Windows mode (see
  `user-data.ts`). The DB is preserved across launches; seeding is
  opt-in via the `seed-db` IPC (exposed from the Settings page).
- Two custom protocols are registered in `app.on('ready')`:
  - `app://` serves the Angular build from inside the ASAR archive
    (avoids Windows-specific 404s seen with an HTTP server + ASAR).
  - `local-resource://` serves user-uploaded images from the userData
    `images/` directory. The Windows drive-letter handling
    (`parsed.host + ':' + parsed.pathname`) is load-bearing — don't
    "simplify" it.
- `BrowserWindow` runs with `nodeIntegration: true` and
  `contextIsolation: false`. This is why the renderer can do
  `(window as any).require('electron')` directly — keep the trade-off
  in mind when adding third-party content into the window.

### Auto-updater

`autoUpdater` (electron-updater) is wired in `main.ts` but **only
activates when `app.isPackaged && !isDevMode()`**. The renderer talks
to it via three IPC channels: `check-for-updates`, `download-update`,
`quit-and-install-update`. Publishing target is GitHub Releases (see
`build.publish` in `package.json`).

### Backup / restore lifecycle

`BackupService` (`src/electron/services/backup.service.ts`) zips
`prime.sqlite` + any `-wal` / `-shm` sidecar journals + the `images/`
directory. Restore replaces all of them. Two non-obvious rules govern
the restore path — break either and you'll re-introduce the original
bugs:

1. **The TypeORM DataSource MUST be destroyed before file replacement
   and re-initialized after.** SQLite is opened with a file handle —
   on Windows the `copyFileSync` over the live DB fails with EBUSY;
   on macOS/Linux the file gets unlinked but TypeORM keeps writing to
   the old inode, so the renderer sees stale data until the next app
   start. The `import-backup` IPC handler in `main.ts` enforces the
   sequence `destroy → file restore → initialize → normalize image
   paths`. Re-init is best-effort even on error so the app stays
   usable. `normalizeImagePaths` is idempotent (it extracts the bare
   filename and re-prefixes with this machine's `imagesDir`) so safe
   to re-run.

2. **Long-lived services must NOT cache
   `AppDataSource.getRepository()` in a constructor field.** The
   destroy/initialize cycle invalidates any captured `Repository<T>`.
   The fix used in `NoteService` is a lazy getter:
   ```ts
   private get repository(): Repository<Note> {
     return AppDataSource.getRepository(Note);
   }
   ```
   The IPC handlers in `main.ts` already follow this pattern (they
   call `getRepository` per request) — preserve it for any new
   service you introduce.

The "Please restart the application" toast on successful import is
now belt-and-suspenders, not load-bearing: the renderer's in-memory
component state (cached asset list etc.) is the only thing a restart
clears. Data and image paths are already consistent without one.

### Withdrawal/return business logic

The non-trivial domain logic lives in three IPC handlers in `main.ts`:

- `add-withdrawal` — when a withdrawal targets an `asset` (not a
  specific `batch`), it fulfils across batches **ordered by nearest
  expiration_date**, skipping expired and zero-quantity batches, and
  throws if the requested quantity can't be fully sourced. Runs in a
  single TypeORM transaction.
- `return-withdrawal` — partial returns are supported via
  `returned_quantity` accumulation; `return_date` is only set when the
  withdrawal is fully returned. `inefficient_quantity` tracks damaged
  returns and is mirrored onto the batch.
- `force-return-withdrawal` — only valid for non-`must_return`
  withdrawals; redistributes returns across the same-day group of
  withdrawals for that user+asset, **reverse-sorted by expiration
  date** (i.e. returns into the latest-expiry batches first).
- `delete-asset` — **refuses** if any batch of the asset still has an
  unreturned `must_return` withdrawal (`return_date IS NULL`). If
  clear, cascades in a single transaction: notes (asset + batches +
  withdrawals) → withdrawals → batches → asset. Outside the
  transaction, best-effort removes the image file — but only if the
  resolved path is inside `<userData>/images/` (path-traversal guard
  via `startsWith(imagesDir + path.sep)`). Apply the same refuse +
  cascade + sandboxed-cleanup pattern to any future `delete-*`
  handler.

Before changing any of these, read the handler — the ordering and the
"already returned" guards are subtle and the tests don't cover the
full matrix.

## i18n

- Source locale: `en-US`. Target: `it` (Italian) at `/it/` base href.
- Strings are tagged with Angular's `i18n` attribute /  `$localize`
  template literals.
- **`npm run extract-i18n` does NOT auto-merge into translated XLF
  files.** It rewrites `src/locale/messages.xlf` (source) only. Each
  new `<trans-unit>` must be added by hand to
  `src/locale/messages.it.xlf` with a matching `<target>`. Validate
  by running `npx ng build --localize` — Angular fails the build if a
  placeholder (e.g. `<x id="assetName"/>`) appears in one of `source`
  / `target` but not the other.
- The Electron main process picks the locale to load via `--lang=it`
  CLI flag (passed by `npm run electron:it`) and from the
  `--ui=/it/` arg in dev mode.
- PrimeNG translations: `app.config.ts` reads `$localize.locale` at
  bootstrap and feeds either `primelocale/js/it` or the default into
  `providePrimeNG({ translation })`.

## Testing

- Runner is **Vitest** via `@angular/build:unit-test` (not Karma —
  some Angular CLI docs still reference it; ignore those for this
  repo).
- jsdom is the test environment (see `devDependencies`).
- Specs colocate as `*.spec.ts` next to the unit they cover. Many were
  recently deleted (see `git status`) — the suite is intentionally
  light right now; don't pad it without a reason.
