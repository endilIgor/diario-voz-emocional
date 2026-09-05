import type { StorageAdapter } from './types';

export function createInMemoryStorage(): StorageAdapter {
  const data = new Map<string, string>();

  return {
    async getItem(key) {
      return data.has(key) ? data.get(key)! : null;
    },
    async setItem(key, value) {
      data.set(key, value);
    },
    async removeItem(key) {
      data.delete(key);
    },
  };
}
