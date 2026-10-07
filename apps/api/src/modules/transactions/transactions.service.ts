import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { applyBalanceDelta } from '../../common/balance';
import { parseDateOnly } from '../../common/dates';
import { buildMeta } from '../../common/dto/pagination.dto';
import { signedAmount, sumDecimals, toDecimal } from '../../common/money';
import { requireAccount, requireCategory } from '../../common/ownership';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionDto, ListTransactionsQueryDto, UpdateTransactionDto } from './dto/transaction.dto';

const INCLUDE = {
  account: { select: { id: true, name: true, type: true } },
  category: { select: { id: true, name: true, icon: true, color: true } },
} as const;

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, q: ListTransactionsQueryDto) {
    const where: Prisma.TransactionWhereInput = {
      userId, // <- data isolation: every query is scoped to the caller
      ...(q.type ? { type: q.type } : {}),
      ...(q.accountId ? { accountId: q.accountId } : {}),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.from || q.to
        ? {
            transactionDate: {
              ...(q.from ? { gte: parseDateOnly(q.from) } : {}),
              ...(q.to ? { lte: parseDateOnly(q.to) } : {}),
            },
          }
        : {}),
      ...(q.search
        ? {
            OR: [
              { note: { contains: q.search, mode: 'insensitive' } },
              { category: { name: { contains: q.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total, grouped] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ [q.sortBy]: q.sortOrder }, { createdAt: 'desc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.groupBy({ by: ['type'], where, _sum: { amount: true } }),
    ]);

    const totalOf = (type: 'INCOME' | 'EXPENSE') =>
      sumDecimals(grouped.filter((g) => g.type === type).map((g) => g._sum.amount));
    // `totals` covers the whole filtered set, not just the current page.
    return { items, meta: buildMeta(q.page, q.pageSize, total), totals: { income: totalOf('INCOME'), expense: totalOf('EXPENSE') } };
  }

  async get(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({ where: { id, userId }, include: INCLUDE });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  /** BEGIN -> validate -> create row -> update balance -> COMMIT (any error = ROLLBACK of both). */
  async create(userId: string, dto: CreateTransactionDto) {
    const amount = toDecimal(dto.amount);
    const transactionDate = parseDateOnly(dto.transactionDate);

    return this.prisma.$transaction(async (tx) => {
      await requireAccount(tx, userId, dto.accountId, { mustBeActive: true });
      await requireCategory(tx, userId, dto.categoryId, dto.type);

      const created = await tx.transaction.create({
        data: {
          userId,
          accountId: dto.accountId,
          categoryId: dto.categoryId,
          type: dto.type,
          amount,
          note: dto.note?.trim() || null,
          transactionDate,
        },
        include: INCLUDE,
      });
      await applyBalanceDelta(tx, userId, dto.accountId, signedAmount(dto.type, amount));
      return created;
    });
  }

  /** Edit = undo the old effect on the old account, apply the new effect on the new account. */
  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findFirst({ where: { id, userId } });
      if (!existing) throw new NotFoundException('Transaction not found');

      const type = dto.type ?? existing.type;
      const accountId = dto.accountId ?? existing.accountId;
      const categoryId = dto.categoryId ?? existing.categoryId;
      const amount = dto.amount !== undefined ? toDecimal(dto.amount) : existing.amount;

      if (accountId !== existing.accountId) await requireAccount(tx, userId, accountId, { mustBeActive: true });
      await requireCategory(tx, userId, categoryId, type); // also catches type changed without a matching category

      await applyBalanceDelta(tx, userId, existing.accountId, signedAmount(existing.type, existing.amount).neg());
      await applyBalanceDelta(tx, userId, accountId, signedAmount(type, amount));

      return tx.transaction.update({
        where: { id, userId },
        data: {
          type,
          amount,
          accountId,
          categoryId,
          ...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
          ...(dto.transactionDate ? { transactionDate: parseDateOnly(dto.transactionDate) } : {}),
        },
        include: INCLUDE,
      });
    });
  }

  remove(userId: string, id: string): Promise<{ deleted: true }> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findFirst({ where: { id, userId } });
      if (!existing) throw new NotFoundException('Transaction not found');
      await tx.transaction.delete({ where: { id, userId } });
      await applyBalanceDelta(tx, userId, existing.accountId, signedAmount(existing.type, existing.amount).neg());
      return { deleted: true as const };
    });
  }
}
