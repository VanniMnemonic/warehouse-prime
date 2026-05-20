// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  AllocatableBatch,
  allocateAcrossBatches,
  pickValidBatchesForAsset,
  sortBatchesForForceReturn,
} from './withdrawal-logic';

function batch(
  id: number,
  quantity: number,
  expiration: Date | string | null | undefined = undefined,
): AllocatableBatch {
  return { id, quantity, expiration_date: expiration ?? null };
}

const NOW = new Date('2026-05-01T00:00:00Z');
const PAST = new Date('2025-01-01T00:00:00Z');
const SOON = new Date('2026-05-10T00:00:00Z');
const LATER = new Date('2027-06-01T00:00:00Z');

describe('pickValidBatchesForAsset', () => {
  it('returns dated batches in nearest-expiration-first order', () => {
    const out = pickValidBatchesForAsset(
      [batch(3, 5, LATER), batch(1, 5, SOON), batch(2, 5, LATER)],
      NOW,
    );
    expect(out.map((b) => b.id)).toEqual([1, 3, 2]);
  });

  it('places undated batches after every dated one', () => {
    const out = pickValidBatchesForAsset(
      [batch(1, 5, SOON), batch(2, 5, null), batch(3, 5, LATER)],
      NOW,
    );
    expect(out.map((b) => b.id)).toEqual([1, 3, 2]);
  });

  it('drops zero-quantity batches', () => {
    const out = pickValidBatchesForAsset(
      [batch(1, 0, SOON), batch(2, 5, LATER)],
      NOW,
    );
    expect(out.map((b) => b.id)).toEqual([2]);
  });

  it('drops expired batches', () => {
    const out = pickValidBatchesForAsset(
      [batch(1, 5, PAST), batch(2, 5, SOON)],
      NOW,
    );
    expect(out.map((b) => b.id)).toEqual([2]);
  });

  it('keeps batches whose expiration is exactly "now"', () => {
    // Boundary case: `>= now`. A batch expiring at the same instant the
    // withdrawal request runs is still considered valid stock.
    const out = pickValidBatchesForAsset([batch(1, 5, NOW)], NOW);
    expect(out.map((b) => b.id)).toEqual([1]);
  });

  it('accepts ISO strings just like Date instances (TypeORM SQLite hydration)', () => {
    const out = pickValidBatchesForAsset(
      [batch(1, 5, SOON.toISOString()), batch(2, 5, LATER.toISOString())],
      NOW,
    );
    expect(out.map((b) => b.id)).toEqual([1, 2]);
  });

  it('returns an empty array when every batch is invalid', () => {
    const out = pickValidBatchesForAsset(
      [batch(1, 0), batch(2, 5, PAST)],
      NOW,
    );
    expect(out).toEqual([]);
  });
});

describe('sortBatchesForForceReturn', () => {
  it('returns batches in latest-expiration-first order, undated first', () => {
    const out = sortBatchesForForceReturn([
      batch(1, 5, SOON),
      batch(2, 5, LATER),
      batch(3, 5, null),
    ]);
    expect(out.map((b) => b.id)).toEqual([3, 2, 1]);
  });

  it('does not mutate the input array', () => {
    const input = [batch(1, 5, SOON), batch(2, 5, LATER)];
    const out = sortBatchesForForceReturn(input);
    expect(input.map((b) => b.id)).toEqual([1, 2]);
    expect(out.map((b) => b.id)).toEqual([2, 1]);
  });
});

describe('allocateAcrossBatches', () => {
  it('drains the first batch in full before moving on', () => {
    const { allocations, remaining } = allocateAcrossBatches(
      [batch(1, 3), batch(2, 5), batch(3, 5)],
      7,
    );
    expect(allocations).toEqual([
      { batch: { id: 1, quantity: 3, expiration_date: null }, take: 3 },
      { batch: { id: 2, quantity: 5, expiration_date: null }, take: 4 },
    ]);
    expect(remaining).toBe(0);
  });

  it('reports remaining quantity when the request exceeds available stock', () => {
    const { allocations, remaining } = allocateAcrossBatches(
      [batch(1, 2), batch(2, 3)],
      10,
    );
    expect(allocations).toHaveLength(2);
    expect(remaining).toBe(5);
  });

  it('takes exactly the amount needed when the first batch is enough', () => {
    const { allocations, remaining } = allocateAcrossBatches(
      [batch(1, 100), batch(2, 100)],
      4,
    );
    expect(allocations).toEqual([
      { batch: { id: 1, quantity: 100, expiration_date: null }, take: 4 },
    ]);
    expect(remaining).toBe(0);
  });

  it('skips batches that contribute nothing (zero quantity)', () => {
    const { allocations, remaining } = allocateAcrossBatches(
      [batch(1, 0), batch(2, 5)],
      3,
    );
    expect(allocations).toEqual([
      { batch: { id: 2, quantity: 5, expiration_date: null }, take: 3 },
    ]);
    expect(remaining).toBe(0);
  });

  it('returns an empty allocation when asked for zero', () => {
    const { allocations, remaining } = allocateAcrossBatches([batch(1, 5)], 0);
    expect(allocations).toEqual([]);
    expect(remaining).toBe(0);
  });

  it('handles an empty batch list', () => {
    const { allocations, remaining } = allocateAcrossBatches([], 4);
    expect(allocations).toEqual([]);
    expect(remaining).toBe(4);
  });
});
