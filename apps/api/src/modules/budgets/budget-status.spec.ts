import { Decimal } from '../../common/money';
import { computeBudgetStatus } from './budget-status';

const d = (v: string) => new Decimal(v);

describe('computeBudgetStatus', () => {
  it('3.000.000 budget, 2.100.000 spent -> remaining 900.000, 70%, OK', () => {
    const r = computeBudgetStatus(d('2100000'), d('3000000'));
    expect(r.remaining.toFixed(0)).toBe('900000');
    expect(r.percentUsed).toBe(70);
    expect(r.status).toBe('OK');
  });

  it('warns at 80% and above', () => {
    expect(computeBudgetStatus(d('2400000'), d('3000000')).status).toBe('WARNING');
    expect(computeBudgetStatus(d('3000000'), d('3000000')).status).toBe('WARNING'); // exactly 100% is not "exceeded"
  });

  it('is exceeded only when spent > budget', () => {
    const r = computeBudgetStatus(d('3000001'), d('3000000'));
    expect(r.status).toBe('EXCEEDED');
    expect(r.remaining.isNegative()).toBe(true);
  });
});
