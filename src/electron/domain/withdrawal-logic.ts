// Pure helpers extracted from the `add-withdrawal` and
// `force-return-withdrawal` IPC handlers. They are deliberately decoupled
// from TypeORM transactions and from Electron — the handlers wire them
// together with DB reads/writes, the tests exercise them with plain
// objects.
//
// Domain rules captured here:
//
//   - When fulfilling a request against an asset (not a specific batch),
//     we draw from batches in **ascending expiration_date order**, with
//     null dates last; expired and zero-quantity batches are excluded.
//   - For a force-return (non-`must_return` withdrawals being restocked),
//     the inverse order applies: return quantity goes into the batches
//     with the **latest expiration first**, so the freshest stock takes
//     the hit rather than rescuing a near-expiry batch.

/**
 * Minimal shape of a Batch used by the allocator. Mirrors the relevant
 * columns of the `Batch` TypeORM entity but stays structural so tests can
 * build fixtures without instantiating the decorator-heavy entity class.
 */
export interface AllocatableBatch {
  id: number;
  quantity: number;
  expiration_date?: Date | string | null;
}

/**
 * Filter to batches that have positive quantity AND are either undated
 * or not yet expired, then sort them by nearest expiration first
 * (null/undated rows go last). Used by `add-withdrawal` when the caller
 * targets an asset rather than a specific batch.
 */
export function pickValidBatchesForAsset<T extends AllocatableBatch>(batches: T[], now: Date): T[] {
  const nowTime = now.getTime();
  return batches
    .filter((b) => {
      if (b.quantity <= 0) return false;
      if (!b.expiration_date) return true;
      return new Date(b.expiration_date).getTime() >= nowTime;
    })
    .sort((a, b) => expirationKey(a) - expirationKey(b));
}

/**
 * Sort batches by latest expiration first (null/undated rows treated as
 * "infinitely far in the future"). Used by `force-return-withdrawal` to
 * decide which batches absorb returned quantity first.
 */
export function sortBatchesForForceReturn<T extends AllocatableBatch>(batches: T[]): T[] {
  return [...batches].sort((a, b) => expirationKey(b) - expirationKey(a));
}

/**
 * Allocate a requested quantity across an ordered list of batches,
 * draining each batch in turn. Returns one entry per batch that
 * contributes, plus the remaining quantity that could not be sourced
 * (zero on a fully satisfied request).
 */
export function allocateAcrossBatches<T extends AllocatableBatch>(
  batches: T[],
  quantity: number,
): { allocations: Array<{ batch: T; take: number }>; remaining: number } {
  const allocations: Array<{ batch: T; take: number }> = [];
  let remaining = quantity;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    if (take > 0) {
      allocations.push({ batch, take });
      remaining -= take;
    }
  }
  return { allocations, remaining };
}

function expirationKey(batch: AllocatableBatch): number {
  if (!batch.expiration_date) return Number.MAX_SAFE_INTEGER;
  return new Date(batch.expiration_date).getTime();
}
