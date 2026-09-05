import type { JournalEntry, ThemeKey } from '../types';

export type TrendsResult = {
  averageScore: number;
  mostCommonTheme: ThemeKey;
  mostFrequentWord: string | null;
  perceivedPattern: string;
};

const MIN_ENTRIES_FOR_TRENDS = 3;
const RECENT_WINDOW = 5;

const STOPWORDS = new Set([
  'a',
  'ao',
  'aos',
  'as',
  'com',
  'como',
  'da',
  'das',
  'de',
  'do',
  'dos',
  'e',
  'em',
  'essa',
  'esse',
  'estou',
  'eu',
  'foi',
  'hoje',
  'meu',
  'minha',
  'muita',
  'muito',
  'na',
  'no',
  'nos',
  'não',
  'o',
  'os',
  'para',
  'pouco',
  'que',
  'se',
  'sem',
  'um',
  'uma',
  'à',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,!?;:()"]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

function mostCommon<T>(values: T[]): T {
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let best = values[0];
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = value;
    }
  }

  return best;
}

export function computeTrends(entries: JournalEntry[]): TrendsResult | null {
  if (entries.length < MIN_ENTRIES_FOR_TRENDS) return null;

  const averageScore = entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length;
  const mostCommonTheme = mostCommon(entries.map((entry) => entry.mainTheme));

  const recentEntries = entries.slice(0, RECENT_WINDOW);
  const wordCounts = new Map<string, number>();
  for (const entry of recentEntries) {
    const uniqueWords = new Set(tokenize(entry.transcript));
    for (const word of uniqueWords) {
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
    }
  }

  let mostFrequentWord: string | null = null;
  let mostFrequentCount = 1;
  for (const [word, count] of wordCounts) {
    if (count > mostFrequentCount) {
      mostFrequentCount = count;
      mostFrequentWord = word;
    }
  }

  const perceivedPattern = mostFrequentWord
    ? `Você mencionou "${mostFrequentWord}" em ${mostFrequentCount} dos últimos ${recentEntries.length} check-ins.`
    : 'Ainda não encontramos um padrão claro nos seus últimos check-ins.';

  return {
    averageScore,
    mostCommonTheme,
    mostFrequentWord,
    perceivedPattern,
  };
}
