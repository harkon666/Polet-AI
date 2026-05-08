import { describe, expect, test } from 'bun:test';
import { toJsonSafe } from '../src/lib/json-safe';

describe('JSON-safe values', () => {
  test('converts nested bigint values to decimal strings', () => {
    const value = {
      success: true,
      data: {
        amount: 123n,
        policies: [{ encryptedDailySpent: 456n }],
      },
    };

    expect(toJsonSafe(value)).toEqual({
      success: true,
      data: {
        amount: '123',
        policies: [{ encryptedDailySpent: '456' }],
      },
    });
  });
});
