import { BadRequestException } from '@nestjs/common';

export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

const TIMEZONE = 'Asia/Ho_Chi_Minh';

/** 'YYYY-MM-DD' -> Date at UTC midnight. Rejects impossible dates such as 2026-02-31. */
export function parseDateOnly(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || toDateOnly(date) !== value) {
    throw new BadRequestException(`Invalid date: ${value}`);
  }
  return date;
}

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today's calendar date in Vietnam, as UTC midnight (what @db.Date columns hold). */
export function todayVN(now: Date = new Date()): Date {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(now);
  return parseDateOnly(ymd);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate(); // month: 1-12
}

export function monthBounds(year: number, month: number): { from: Date; to: Date } {
  return {
    from: new Date(Date.UTC(year, month - 1, 1)),
    to: new Date(Date.UTC(year, month - 1, daysInMonth(year, month))),
  };
}

export function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/**
 * Next run date of a recurring rule. `anchorDay` keeps "the 31st" from drifting:
 * Jan 31 -> Feb 28 -> Mar 31 (not Mar 28).
 */
export function nextOccurrence(current: Date, frequency: Frequency, anchorDay?: number | null): Date {
  switch (frequency) {
    case 'DAILY':
      return addDays(current, 1);
    case 'WEEKLY':
      return addDays(current, 7);
    case 'MONTHLY':
    case 'YEARLY': {
      const step = frequency === 'MONTHLY' ? 1 : 12;
      const target = addMonths(current, step);
      const year = target.getUTCFullYear();
      const month = target.getUTCMonth() + 1;
      const day = Math.min(anchorDay ?? current.getUTCDate(), daysInMonth(year, month));
      return new Date(Date.UTC(year, month - 1, day));
    }
  }
}

export type RangePreset =
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year'
  | 'custom';

/** Resolves a report range preset into inclusive [from, to] dates. */
export function resolveRange(
  preset: RangePreset,
  custom: { from?: string; to?: string } = {},
  today: Date = todayVN(),
): { from: Date; to: Date } {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth() + 1;
  const endOfThisMonth = monthBounds(y, m).to;

  switch (preset) {
    case 'this_month':
      return monthBounds(y, m);
    case 'last_month': {
      const prev = addMonths(today, -1);
      return monthBounds(prev.getUTCFullYear(), prev.getUTCMonth() + 1);
    }
    case 'last_3_months':
      return { from: addMonths(today, -2), to: endOfThisMonth };
    case 'last_6_months':
      return { from: addMonths(today, -5), to: endOfThisMonth };
    case 'this_year':
      return { from: new Date(Date.UTC(y, 0, 1)), to: new Date(Date.UTC(y, 11, 31)) };
    case 'custom': {
      if (!custom.from || !custom.to) {
        throw new BadRequestException('Custom range requires both "from" and "to"');
      }
      const from = parseDateOnly(custom.from);
      const to = parseDateOnly(custom.to);
      if (from > to) throw new BadRequestException('"from" must be before "to"');
      return { from, to };
    }
  }
}
