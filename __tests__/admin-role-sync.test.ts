import { describe, test, expect, mock } from 'bun:test';
import { isUserAdmin } from '@/lib/admin-utils';

describe('Admin Role Synchronization', () => {
  test('isUserAdmin checks database directly', async () => {
    const result = await isUserAdmin('non-existent-user-id');
    expect(result).toBe(false);
  });
});
