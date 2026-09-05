import {
  FREE_CHECKIN_LIMIT,
  canRecordCheckIn,
  checkinsRemaining,
  countCheckInsInMonth,
} from './subscription';
import type { JournalEntry } from '../types';

function makeEntry(daysAgoISO: string): JournalEntry {
  return {
    id: Math.random().toString(36),
    createdAt: daysAgoISO,
    transcript: 't',
    mood: 'neutro',
    score: 5,
    mainTheme: 'geral',
    summary: 's',
    positiveSignal: 'p',
    reflectionQuestion: 'q?',
  };
}

describe('subscription limits', () => {
  it('define o limite gratuito como 3 check-ins por mês', () => {
    expect(FREE_CHECKIN_LIMIT).toBe(3);
  });

  it('permite check-in no plano grátis abaixo do limite', () => {
    expect(canRecordCheckIn('free', 2)).toBe(true);
  });

  it('bloqueia check-in no plano grátis ao atingir o limite', () => {
    expect(canRecordCheckIn('free', 3)).toBe(false);
  });

  it('sempre permite check-in no plano premium', () => {
    expect(canRecordCheckIn('premium', 100)).toBe(true);
  });

  it('calcula check-ins restantes no plano grátis', () => {
    expect(checkinsRemaining('free', 1)).toBe(2);
    expect(checkinsRemaining('free', 3)).toBe(0);
  });

  it('retorna null para check-ins restantes no plano premium (ilimitado)', () => {
    expect(checkinsRemaining('premium', 50)).toBeNull();
  });

  it('conta apenas check-ins do mês de referência', () => {
    const reference = new Date('2026-09-15T12:00:00.000Z');
    const entries: JournalEntry[] = [
      makeEntry('2026-09-01T10:00:00.000Z'),
      makeEntry('2026-09-14T10:00:00.000Z'),
      makeEntry('2026-08-30T10:00:00.000Z'),
      makeEntry('2026-10-01T10:00:00.000Z'),
    ];

    expect(countCheckInsInMonth(entries, reference)).toBe(2);
  });
});
