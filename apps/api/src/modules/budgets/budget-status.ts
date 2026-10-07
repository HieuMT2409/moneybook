import { Decimal } from '../../common/money';

export type BudgetStatus = 'OK' | 'WARNING' | 'EXCEEDED';

export const WARNING_THRESHOLD_PERCENT = 80;

/** spent > budget -> EXCEEDED; spent >= 80% of budget -> WARNING; otherwise OK. */
export function computeBudgetStatus(spent: Decimal, budget: Decimal) {
  const remaining = budget.minus(spent);
  const percentUsed = budget.gt(0) ? spent.div(budget).times(100).toDecimalPlaces(1).toNumber() : 0;
  const status: BudgetStatus = spent.gt(budget)
    ? 'EXCEEDED'
    : percentUsed >= WARNING_THRESHOLD_PERCENT
      ? 'WARNING'
      : 'OK';
  return { spent, remaining, percentUsed, status };
}
