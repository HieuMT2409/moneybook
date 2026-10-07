import { addMonths, toDateOnly } from '../../common/dates';
import { calcSavingsRate, Decimal, ZERO } from '../../common/money';

export interface TxLike {
  type: 'INCOME' | 'EXPENSE';
  amount: Decimal;
  transactionDate: Date;
}

export interface Summary {
  income: Decimal;
  expense: Decimal;
  savings: Decimal;
  savingsRate: number;
}

export function buildSummary(income: Decimal, expense: Decimal): Summary {
  return { income, expense, savings: income.minus(expense), savingsRate: calcSavingsRate(income, expense) };
}

export function monthKey(date: Date): string {
  return toDateOnly(date).slice(0, 7); // 'YYYY-MM'
}

/** Every month key from `from` to `to`, inclusive, so charts show months with no activity too. */
export function monthKeysBetween(from: Date, to: Date): string[] {
  const keys: string[] = [];
  for (let d = addMonths(from, 0); d <= to; d = addMonths(d, 1)) keys.push(monthKey(d));
  return keys;
}

export function bucketByMonth(items: TxLike[], from: Date, to: Date) {
  const buckets = new Map(monthKeysBetween(from, to).map((k) => [k, { income: ZERO, expense: ZERO }]));
  for (const item of items) {
    const bucket = buckets.get(monthKey(item.transactionDate));
    if (!bucket) continue;
    if (item.type === 'INCOME') bucket.income = bucket.income.plus(item.amount);
    else bucket.expense = bucket.expense.plus(item.amount);
  }
  return [...buckets.entries()].map(([month, v]) => ({ month, ...v, savings: v.income.minus(v.expense) }));
}

export function bucketByDay(items: TxLike[], from: Date, to: Date) {
  const buckets = new Map<string, { income: Decimal; expense: Decimal }>();
  for (let d = from; d <= to; d = new Date(d.getTime() + 86_400_000)) {
    buckets.set(toDateOnly(d), { income: ZERO, expense: ZERO });
  }
  for (const item of items) {
    const bucket = buckets.get(toDateOnly(item.transactionDate));
    if (!bucket) continue;
    if (item.type === 'INCOME') bucket.income = bucket.income.plus(item.amount);
    else bucket.expense = bucket.expense.plus(item.amount);
  }
  return [...buckets.entries()].map(([period, v]) => ({ period, income: v.income, expense: v.expense }));
}

/** Adds net (income - expense) and a running cumulative total to each point. */
export function withCumulative<T extends { income: Decimal; expense: Decimal }>(points: T[]) {
  let running = ZERO;
  return points.map((p) => {
    const net = p.income.minus(p.expense);
    running = running.plus(net);
    return { ...p, net, cumulative: running };
  });
}

export interface NetWorthAccount {
  id: string;
  name: string;
  type: string;
  balance: Decimal;
}
export interface NetWorthDebt {
  type: 'LEND' | 'BORROW';
  totalAmount: Decimal;
  paidAmount: Decimal;
}

/**
 * Assets      = accounts with a positive balance + money others owe me (LEND, still unpaid)
 * Liabilities = accounts with a negative balance (e.g. credit card) + money I owe (BORROW, still unpaid)
 * Net worth   = Assets - Liabilities
 */
export function computeNetWorth(accounts: NetWorthAccount[], debts: NetWorthDebt[]) {
  const accountAssets = accounts.reduce((s, a) => (a.balance.gt(0) ? s.plus(a.balance) : s), ZERO);
  const accountLiabilities = accounts.reduce((s, a) => (a.balance.lt(0) ? s.plus(a.balance.abs()) : s), ZERO);
  const remaining = (d: NetWorthDebt) => d.totalAmount.minus(d.paidAmount);
  const receivables = debts.filter((d) => d.type === 'LEND').reduce((s, d) => s.plus(remaining(d)), ZERO);
  const payables = debts.filter((d) => d.type === 'BORROW').reduce((s, d) => s.plus(remaining(d)), ZERO);

  const assets = accountAssets.plus(receivables);
  const liabilities = accountLiabilities.plus(payables);
  return {
    assets: { accounts: accountAssets, receivables, total: assets },
    liabilities: { accounts: accountLiabilities, payables, total: liabilities },
    netWorth: assets.minus(liabilities),
  };
}
