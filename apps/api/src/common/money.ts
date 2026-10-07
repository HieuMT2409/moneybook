import { Decimal } from '@prisma/client/runtime/library';

export { Decimal };
export type MoneyInput = Decimal | string | number;

export const ZERO = new Decimal(0);

export function toDecimal(value: MoneyInput): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

export function sumDecimals(values: Array<Decimal | null | undefined>): Decimal {
  return values.reduce<Decimal>((acc, v) => (v ? acc.plus(v) : acc), ZERO);
}

/** Income increases a balance, expense decreases it. Amounts are always stored positive. */
export function signedAmount(type: 'INCOME' | 'EXPENSE', amount: MoneyInput): Decimal {
  const value = toDecimal(amount);
  return type === 'INCOME' ? value : value.neg();
}

/** (income - expense) / income * 100, rounded to 1 decimal. 0 when there is no income. */
export function calcSavingsRate(income: Decimal, expense: Decimal): number {
  if (income.lte(0)) return 0;
  return income.minus(expense).div(income).times(100).toDecimalPlaces(1).toNumber();
}
