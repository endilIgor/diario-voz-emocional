import type { JournalEntry, SubscriptionPlan } from '../types';

export const FREE_CHECKIN_LIMIT = 3;

export function canRecordCheckIn(plan: SubscriptionPlan, checkinsUsedThisMonth: number): boolean {
  if (plan === 'premium') return true;
  return checkinsUsedThisMonth < FREE_CHECKIN_LIMIT;
}

export function checkinsRemaining(
  plan: SubscriptionPlan,
  checkinsUsedThisMonth: number
): number | null {
  if (plan === 'premium') return null;
  return Math.max(0, FREE_CHECKIN_LIMIT - checkinsUsedThisMonth);
}

export function countCheckInsInMonth(entries: JournalEntry[], referenceDate: Date): number {
  return entries.filter((entry) => {
    const entryDate = new Date(entry.createdAt);
    return (
      entryDate.getUTCFullYear() === referenceDate.getUTCFullYear() &&
      entryDate.getUTCMonth() === referenceDate.getUTCMonth()
    );
  }).length;
}
