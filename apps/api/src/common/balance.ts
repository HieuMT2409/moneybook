import { Prisma } from '@prisma/client';
import { MoneyInput, toDecimal } from './money';

/**
 * THE balance engine. This is the only function in the codebase that changes Account.balance
 * for transactions/transfers/debt payments. It uses an atomic `increment` (SQL: balance = balance + x)
 * so two concurrent requests can never overwrite each other, and it must be called with the
 * transaction client (`tx`) so it commits or rolls back together with the record that caused it.
 */
export async function applyBalanceDelta(
  tx: Prisma.TransactionClient,
  userId: string,
  accountId: string,
  delta: MoneyInput,
): Promise<void> {
  await tx.account.update({
    where: { id: accountId, userId },
    data: { balance: { increment: toDecimal(delta) } },
  });
}
