import { computeTrends } from './trends';
import type { JournalEntry } from '../types';

function makeEntry(overrides: Partial<JournalEntry>): JournalEntry {
  return {
    id: overrides.id ?? Math.random().toString(36),
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    transcript: overrides.transcript ?? 'Hoje senti pressão no trabalho.',
    mood: overrides.mood ?? 'sobrecarregado',
    score: overrides.score ?? 4,
    mainTheme: overrides.mainTheme ?? 'trabalho',
    summary: overrides.summary ?? 'resumo',
    positiveSignal: overrides.positiveSignal ?? 'ponto positivo',
    reflectionQuestion: overrides.reflectionQuestion ?? 'Pergunta?',
  };
}

describe('computeTrends', () => {
  it('retorna null quando há menos de 3 entradas', () => {
    const entries = [makeEntry({}), makeEntry({})];

    expect(computeTrends(entries)).toBeNull();
  });

  it('calcula humor médio a partir das pontuações', () => {
    const entries = [
      makeEntry({ score: 4 }),
      makeEntry({ score: 6 }),
      makeEntry({ score: 8 }),
    ];

    const trends = computeTrends(entries);

    expect(trends).not.toBeNull();
    expect(trends?.averageScore).toBeCloseTo(6, 5);
  });

  it('identifica o tema mais citado', () => {
    const entries = [
      makeEntry({ mainTheme: 'trabalho' }),
      makeEntry({ mainTheme: 'trabalho' }),
      makeEntry({ mainTheme: 'relacionamento' }),
    ];

    const trends = computeTrends(entries);

    expect(trends?.mostCommonTheme).toBe('trabalho');
  });

  it('identifica a palavra recorrente nos relatos', () => {
    const entries = [
      makeEntry({ transcript: 'Senti muita pressão hoje no trabalho.' }),
      makeEntry({ transcript: 'A pressão do trabalho continua forte.' }),
      makeEntry({ transcript: 'Hoje a pressão diminuiu um pouco.' }),
    ];

    const trends = computeTrends(entries);

    expect(trends?.mostFrequentWord).toBe('pressão');
  });

  it('gera uma frase de padrão percebido mencionando a palavra recorrente', () => {
    const entries = [
      makeEntry({ transcript: 'Senti muita pressão hoje no trabalho.' }),
      makeEntry({ transcript: 'A pressão do trabalho continua forte.' }),
      makeEntry({ transcript: 'Hoje a pressão diminuiu um pouco.' }),
      makeEntry({ transcript: 'Consegui relaxar um pouco à noite.' }),
    ];

    const trends = computeTrends(entries);

    expect(trends?.perceivedPattern.toLowerCase()).toContain('pressão');
  });
});
