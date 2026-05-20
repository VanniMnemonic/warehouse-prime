// Domain model interfaces shared between the Angular renderer and the
// Electron main process.
//
// They mirror the TypeORM entities under `src/electron/entities/` but are
// plain TS (no decorators) so the renderer can import them without
// pulling TypeORM's runtime into the bundle.
//
// Convention:
//   - `?:` matches the entity's nullable column.
//   - Relations are optional (`?:`) because most IPC handlers only load
//     them on demand via `relations: [...]`. Don't assume they're set.
//   - Date columns arrive as `Date` objects through Electron's structured
//     clone (TypeORM hydration). Raw-SQL responses arrive as ISO strings,
//     so the union acknowledges both.

export type DateLike = Date | string;

export interface Title {
  id: number;
  title: string;
}

export interface Location {
  id: number;
  denomination: string;
  description?: string | null;
  phone?: string | null;
  parent_id?: number | null;
  sort_order: number;
  parent?: Location;
  children?: Location[];
}

export interface Asset {
  id: number;
  denomination: string;
  part_number?: string | null;
  barcode?: string | null;
  min_stock: number;
  image_path?: string | null;
}

/**
 * Returned by the `get-assets` IPC handler — Asset enriched with the
 * batch / withdrawal aggregates computed lato SQL.
 */
export interface AssetWithDetails extends Asset {
  total_quantity: number;
  inefficient_quantity: number;
  withdrawn_quantity: number;
  is_below_min_stock: boolean;
  has_expired_batches: boolean;
  has_near_expiry_batches: boolean;
}

export interface Batch {
  id: number;
  denomination: string;
  asset_id: number;
  asset?: Asset;
  location_id?: number | null;
  location?: Location;
  serial_number?: string | null;
  expiration_date?: DateLike | null;
  quantity: number;
  inefficient_quantity: number;
}

export interface User {
  id: number;
  title_id?: number | null;
  title?: Title;
  first_name: string;
  last_name: string;
  barcode?: string | null;
  email: string;
  mobile?: string | null;
  location_id?: number | null;
  location?: Location;
  image_path?: string | null;
}

/**
 * Returned by `get-users` — User with the active-withdrawal count
 * computed lato SQL.
 */
export interface UserWithDetails extends User {
  active_withdrawals: number;
}

export interface Withdrawal {
  id: number;
  date: DateLike;
  quantity: number;
  user_id: number;
  user?: User;
  batch_id: number;
  batch?: Batch;
  must_return: boolean;
  expected_return_date?: DateLike | null;
  returned_quantity: number;
  return_date?: DateLike | null;
  inefficient_quantity: number;
}

export interface Note {
  id: number;
  content: string;
  created_at: DateLike;
  asset_id?: number | null;
  batch_id?: number | null;
  location_id?: number | null;
  title_id?: number | null;
  user_id?: number | null;
  withdrawal_id?: number | null;
  asset?: Asset;
  batch?: Batch;
  location?: Location;
  title?: Title;
  user?: User;
  withdrawal?: Withdrawal;
}
