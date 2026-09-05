import type { JournalEntry } from '../types';
import type { StorageAdapter } from './storage/types';

const STORAGE_KEY = '@diario-voz-emocional/journal-entries';

export type JournalStore = {
  getEntries(): Promise<JournalEntry[]>;
  addEntry(entry: JournalEntry): Promise<void>;
  clear(): Promise<void>;
};

export function createJournalStore(storage: StorageAdapter): JournalStore {
  return {
    async getEntries() {
      const raw = await storage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as JournalEntry[];
    },

    async addEntry(entry) {
      const entries = await this.getEntries();
      const updated = [entry, ...entries];
      await storage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },

    async clear() {
      await storage.removeItem(STORAGE_KEY);
    },
  };
}
