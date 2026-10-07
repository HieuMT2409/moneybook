import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { applyBalanceDelta } from '../../common/balance';
import { Decimal, sumDecimals, toDecimal } from '../../common/money';
import { requireAccount } from '../../common/ownership';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, includeInactive = true) {
    return this.prisma.account.findMany({
      where: { userId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    });
  }

  get(userId: string, id: string) {
    return requireAccount(this.prisma, userId, id);
  }

  create(userId: string, dto: CreateAccountDto) {
    const initial = toDecimal(dto.initialBalance ?? 0);
    // A brand-new account has no transactions, so balance === initialBalance.
    return this.prisma.account.create({
      data: {
        userId,
        name: dto.name.trim(),
        type: dto.type,
        initialBalance: initial,
        balance: initial,
        ...(dto.currency ? { currency: dto.currency.toUpperCase() } : {}),
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    return this.prisma.$transaction(async (tx) => {
      const account = await requireAccount(tx, userId, id);
      const data: Prisma.AccountUpdateInput = {};
      if (dto.name !== undefined) data.name = dto.name.trim();
      if (dto.type !== undefined) data.type = dto.type;
      if (dto.isActive !== undefined) data.isActive = dto.isActive;
      if (dto.currency !== undefined) data.currency = dto.currency.toUpperCase();

      if (dto.initialBalance !== undefined) {
        // Changing the opening balance shifts the current balance by the same delta.
        const next = toDecimal(dto.initialBalance);
        data.initialBalance = next;
        await applyBalanceDelta(tx, userId, id, next.minus(account.initialBalance));
      }
      return tx.account.update({ where: { id, userId }, data });
    });
  }

  async remove(userId: string, id: string): Promise<{ deleted: true }> {
    await requireAccount(this.prisma, userId, id);
    const [transactions, transfers, payments, recurring] = await Promise.all([
      this.prisma.transaction.count({ where: { accountId: id, userId } }),
      this.prisma.transfer.count({ where: { userId, OR: [{ fromAccountId: id }, { toAccountId: id }] } }),
      this.prisma.debtPayment.count({ where: { accountId: id, userId } }),
      this.prisma.recurringTransaction.count({ where: { accountId: id, userId } }),
    ]);
    if (transactions + transfers + payments + recurring > 0) {
      throw new ConflictException('Account has related records. Disable it instead of deleting.');
    }
    await this.prisma.account.delete({ where: { id, userId } });
    return { deleted: true };
  }

  /**
   * Recomputes the balance from history and compares it with the stored balance.
   * Used to prove the denormalized balance never drifts.
   */
  async reconcile(userId: string, id: string) {
    const account = await requireAccount(this.prisma, userId, id);
    const [income, expense, out, inc, payments] = await Promise.all([
      this.prisma.transaction.aggregate({ where: { userId, accountId: id, type: 'INCOME' }, _sum: { amount: true } }),
      this.prisma.transaction.aggregate({ where: { userId, accountId: id, type: 'EXPENSE' }, _sum: { amount: true } }),
      this.prisma.transfer.aggregate({ where: { userId, fromAccountId: id }, _sum: { amount: true } }),
      this.prisma.transfer.aggregate({ where: { userId, toAccountId: id }, _sum: { amount: true } }),
      this.prisma.debtPayment.findMany({
        where: { userId, accountId: id },
        select: { amount: true, debt: { select: { type: true } } },
      }),
    ]);
    const debtNet = payments.reduce<Decimal>(
      (acc, p) => (p.debt.type === 'LEND' ? acc.plus(p.amount) : acc.minus(p.amount)),
      new Decimal(0),
    );
    const computed = account.initialBalance
      .plus(sumDecimals([income._sum.amount, inc._sum.amount]))
      .minus(sumDecimals([expense._sum.amount, out._sum.amount]))
      .plus(debtNet);
    return { stored: account.balance, computed, matches: computed.equals(account.balance) };
  }
}
