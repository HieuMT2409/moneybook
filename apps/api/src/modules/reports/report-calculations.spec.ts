import { calcSavingsRate, Decimal } from '../../common/money';
import { bucketByMonth, buildSummary, computeNetWorth, TxLike, withCumulative } from './report-calculations';

const d = (v: string) => new Decimal(v);
const day = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe('savings', () => {
  it('matches the dashboard example: 15.000.000 income, 8.200.000 expense -> 6.800.000, 45.3%', () => {
    const s = buildSummary(d('15000000'), d('8200000'));
    expect(s.savings.toFixed(0)).toBe('6800000');
    expect(s.savingsRate).toBe(45.3);
  });

  it('is 0 when there is no income (no division by zero)', () => {
    expect(calcSavingsRate(d('0'), d('500000'))).toBe(0);
  });
});

describe('bucketByMonth', () => {
  it('groups by month and keeps empty months', () => {
    const items: TxLike[] = [
      { type: 'INCOME', amount: d('100'), transactionDate: day('2026-08-05') },
      { type: 'EXPENSE', amount: d('30'), transactionDate: day('2026-08-20') },
      { type: 'EXPENSE', amount: d('10'), transactionDate: day('2026-10-01') },
    ];
    const result = bucketByMonth(items, day('2026-08-01'), day('2026-10-31'));
    expect(result.map((r) => r.month)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(result[0].savings.toFixed(0)).toBe('70');
    expect(result[1].income.toFixed(0)).toBe('0');
  });
});

describe('withCumulative', () => {
  it('keeps a running net total', () => {
    const r = withCumulative([
      { income: d('100'), expense: d('40') },
      { income: d('0'), expense: d('10') },
    ]);
    expect(r.map((p) => p.cumulative.toFixed(0))).toEqual(['60', '50']);
  });
});

describe('computeNetWorth', () => {
  it('Assets - Liabilities = Net Worth', () => {
    const result = computeNetWorth(
      [
        { id: '1', name: 'Bank', type: 'BANK', balance: d('10000000') },
        { id: '2', name: 'Cash', type: 'CASH', balance: d('2000000') },
        { id: '3', name: 'Visa', type: 'CREDIT_CARD', balance: d('-1500000') },
      ],
      [
        { type: 'LEND', totalAmount: d('1000000'), paidAmount: d('500000') }, // +500.000 receivable
        { type: 'BORROW', totalAmount: d('2000000'), paidAmount: d('0') }, // -2.000.000 payable
      ],
    );
    expect(result.assets.total.toFixed(0)).toBe('12500000'); // 12.000.000 + 500.000
    expect(result.liabilities.total.toFixed(0)).toBe('3500000'); // 1.500.000 + 2.000.000
    expect(result.netWorth.toFixed(0)).toBe('9000000');
  });
});
