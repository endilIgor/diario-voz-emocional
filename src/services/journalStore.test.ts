import { createJournalStore } from './journalStore';
import { createInMemoryStorage } from './storage/inMemoryStorage';
import type { JournalEntry } from '../types';

function makeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: overrides.id ?? '1',
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    transcript: overrides.transcript ?? 'transcript',
    mood: overrides.mood ?? 'neutro',
    score: overrides.score ?? 5,
    mainTheme: overrides.mainTheme ?? 'geral',
    summary: overrides.summary ?? 'summary',
    positiveSignal: overrides.positiveSignal ?? 'positive',
    reflectionQuestion: overrides.reflectionQuestion ?? 'question?',
  };
}

describe('journalStore', () => {
  it('começa vazio', async () => {
    const store = createJournalStore(createInMemoryStorage());

    const entries = await store.getEntries();

    expect(entries).toEqual([]);
  });

  it('salva uma entrada e a retorna na listagem', async () => {
    const store = createJournalStore(createInMemoryStorage());
    const entry = makeEntry({ id: 'a1' });

    await store.addEntry(entry);
    const entries = await store.getEntries();

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(entry);
  });

  it('coloca as entradas mais recentes primeiro', async () => {
    const store = createJournalStore(createInMemoryStorage());

    await store.addEntry(makeEntry({ id: 'first' }));
    await store.addEntry(makeEntry({ id: 'second' }));

    const entries = await store.getEntries();

    expect(entries.map((e: JournalEntry) => e.id)).toEqual(['second', 'first']);
  });

  it('persiste entre instâncias que compartilham o mesmo storage', async () => {
    const storage = createInMemoryStorage();
    const store1 = createJournalStore(storage);
    await store1.addEntry(makeEntry({ id: 'persisted' }));

    const store2 = createJournalStore(storage);
    const entries = await store2.getEntries();

    expect(entries.map((e: JournalEntry) => e.id)).toEqual(['persisted']);
  });

  it('limpa todas as entradas', async () => {
    const store = createJournalStore(createInMemoryStorage());
    await store.addEntry(makeEntry({ id: 'a' }));

    await store.clear();
    const entries = await store.getEntries();

    expect(entries).toEqual([]);
  });

  it('remove apenas a entrada solicitada', async () => {
    const store = createJournalStore(createInMemoryStorage());
    await store.addEntry(makeEntry({ id: 'a' }));
    await store.addEntry(makeEntry({ id: 'b' }));

    await store.removeEntry('a');

    expect((await store.getEntries()).map((entry) => entry.id)).toEqual(['b']);
  });
});
