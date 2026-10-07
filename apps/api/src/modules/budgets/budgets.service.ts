import { Injectable, NotFoundException } from '@nestjs/common';
import { Budget, Category } from '@prisma/client';
import { monthBounds, todayVN } from '../../common/dates';
import { toDecimal, ZERO } from '../../common/money';
import { requireCategory } from '../../common/ownership';
import { PrismaService } from '../../prisma/prisma.service';
import { computeBudgetStatus } from './budget-status';
import { CreateBudgetDto, ListBudgetsQueryDto, UpdateBudgetDto } from './dto/budget.dto';

type BudgetWithCategory = Budget & { category: Pick<Category, 'id' | 'name' | 'icon' | 'color'> };

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, q: ListBudgetsQueryDto) {
    const today = todayVN();
    const month = q.month ?? today.getUTCMonth() + 1;
    const year = q.year ?? today.getUTCFullYear();

    const budgets = await this.prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return { month, year, items: await this.withProgress(userId, budgets, month, year) };
  }

  async create(userId: string, dto: CreateBudgetDto) {
    await requireCategory(this.prisma, userId, dto.categoryId, 'EXPENSE');
    // Unique (user, category, month, year): a duplicate becomes a 409 via the exception filter.
    const budget = await this.prisma.budget.create({
      data: { userId, categoryId: dto.categoryId, amount: toDecimal(dto.amount), month: dto.month, year: dto.year },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
    });
    return (await this.withProgress(userId, [budget], dto.month, dto.year))[0];
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    const existing = await this.prisma.budget.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Budget not found');
    const budget = await this.prisma.budget.update({
      where: { id, userId },
      data: { amount: toDecimal(dto.amount) },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
    });
    return (await this.withProgress(userId, [budget], budget.month, budget.year))[0];
  }

  async remove(userId: string, id: string): Promise<{ deleted: true }> {
    const existing = await this.prisma.budget.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Budget not found');
    await this.prisma.budget.delete({ where: { id, userId } });
    return { deleted: true };
  }

  /** "Spent" is never stored: it is derived from this month's EXPENSE transactions. */
  private async withProgress(userId: string, budgets: BudgetWithCategory[], month: number, year: number) {
    if (budgets.length === 0) return [];
    const { from, to } = monthBounds(year, month);
    const grouped = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        transactionDate: { gte: from, lte: to },
        categoryId: { in: budgets.map((b) => b.categoryId) },
      },
      _sum: { amount: true },
    });
    const spentByCategory = new Map(grouped.map((g) => [g.categoryId, g._sum.amount ?? ZERO]));
    return budgets.map((b) => ({
      ...b,
      ...computeBudgetStatus(spentByCategory.get(b.categoryId) ?? ZERO, b.amount),
    }));
  }
}
