import { BadRequestException } from '@nestjs/common';
import { nextOccurrence, parseDateOnly, resolveRange, toDateOnly, todayVN } from './dates';

const day = (s: string) => parseDateOnly(s);
const fmt = (d: Date) => toDateOnly(d);

describe('parseDateOnly', () => {
  it('accepts a real date', () => expect(fmt(day('2026-10-01'))).toBe('2026-10-01'));
  it('rejects an impossible date', () => expect(() => parseDateOnly('2026-02-31')).toThrow(BadRequestException));
});

describe('todayVN', () => {
  it('uses the Vietnam calendar day (UTC+7), not the UTC day', () => {
    // 20:00 UTC on Oct 5 is already 03:00 on Oct 6 in Vietnam
    expect(fmt(todayVN(new Date('2026-10-05T20:00:00Z')))).toBe('2026-10-06');
  });
});

describe('nextOccurrence', () => {
  it('daily and weekly', () => {
    expect(fmt(nextOccurrence(day('2026-10-31'), 'DAILY'))).toBe('2026-11-01');
    expect(fmt(nextOccurrence(day('2026-10-01'), 'WEEKLY'))).toBe('2026-10-08');
  });

  it('monthly keeps the same day: the 5th -> the 5th', () => {
    expect(fmt(nextOccurrence(day('2026-10-05'), 'MONTHLY', 5))).toBe('2026-11-05');
  });

  it('monthly on the 31st clamps to short months without drifting', () => {
    const feb = nextOccurrence(day('2026-01-31'), 'MONTHLY', 31);
    expect(fmt(feb)).toBe('2026-02-28');
    expect(fmt(nextOccurrence(feb, 'MONTHLY', 31))).toBe('2026-03-31'); // back to the 31st
  });

  it('rolls over the year', () => {
    expect(fmt(nextOccurrence(day('2026-12-15'), 'MONTHLY', 15))).toBe('2027-01-15');
  });

  it('yearly on Feb 29 clamps in non-leap years', () => {
    expect(fmt(nextOccurrence(day('2024-02-29'), 'YEARLY', 29))).toBe('2025-02-28');
  });
});

describe('resolveRange', () => {
  const today = day('2026-10-06');

  it('this month / last month', () => {
    expect(resolveRange('this_month', {}, today)).toEqual({ from: day('2026-10-01'), to: day('2026-10-31') });
    expect(resolveRange('last_month', {}, today)).toEqual({ from: day('2026-09-01'), to: day('2026-09-30') });
  });

  it('last 3 months = 2 previous months + the current one', () => {
    expect(resolveRange('last_3_months', {}, today)).toEqual({ from: day('2026-08-01'), to: day('2026-10-31') });
  });

  it('this year', () => {
    expect(resolveRange('this_year', {}, today)).toEqual({ from: day('2026-01-01'), to: day('2026-12-31') });
  });

  it('custom requires valid, ordered dates', () => {
    expect(() => resolveRange('custom', {}, today)).toThrow(BadRequestException);
    expect(() => resolveRange('custom', { from: '2026-10-10', to: '2026-10-01' }, today)).toThrow(BadRequestException);
    expect(resolveRange('custom', { from: '2026-10-01', to: '2026-10-10' }, today).to).toEqual(day('2026-10-10'));
  });
});
