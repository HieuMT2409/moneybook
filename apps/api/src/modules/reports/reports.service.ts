import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { resolveRange, toDateOnly } from '../../common/dates';
import { sumDecimals, ZERO } from '../../common/money';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoryReportQueryDto, ReportQueryDto } from './dto/report.dto';
import {
  bucketByDay,
  bucketByMonth,
  buildSummary,
  computeNetWorth,
  withCumulative,
} from './report-calculations';

const DAILY_GRANULARITY_MAX_DAYS = 62;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  rangeOf(q: ReportQueryDto) {
    return resolveRange(q.range, { from: q.from, to: q.to });
  }

  async summary(userId: string, from: Date, to: Date) {
    const grouped = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, transactionDate: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    const totalOf = (type: TransactionType) =>
      sumDecimals(grouped.filter((g) => g.type === type).map((g) => g._sum.amount));
    return buildSummary(totalOf('INCOME'), totalOf('EXPENSE'));
  }

  private fetchRows(userId: string, from: Date, to: Date) {
    return this.prisma.transaction.findMany({
      where: { userId, transactionDate: { gte: from, lte: to } },
      select: { type: true, amount: true, transactionDate: true },
    });
  }

  async monthlySeries(userId: string, from: Date, to: Date) {
    return bucketByMonth(await this.fetchRows(userId, from, to), from, to);
  }

  async monthly(userId: string, q: ReportQueryDto) {
    const { from, to } = this.rangeOf(q);
    const [summary, series] = await Promise.all([this.summary(userId, from, to), this.monthlySeries(userId, from, to)]);
    return { range: { from: toDateOnly(from), to: toDateOnly(to) }, summary, series };
  }

  async categoryBreakdown(userId: string, type: TransactionType, from: Date, to: Date) {
    const grouped = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, type, transactionDate: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    const categories = await this.prisma.category.findMany({
      where: { userId, id: { in: grouped.map((g) => g.categoryId) } },
      select: { id: true, name: true, icon: true, color: true },
    });
    const byId = new Map(categories.map((c) => [c.id, c]));
    const total = sumDecimals(grouped.map((g) => g._sum.amount));

    const items = grouped
      .map((g) => {
        const amount = g._sum.amount ?? ZERO;
        return {
          category: byId.get(g.categoryId) ?? null,
          amount,
          percent: total.gt(0) ? amount.div(total).times(100).toDecimalPlaces(1).toNumber() : 0,
        };
      })
      .sort((a, b) => b.amount.comparedTo(a.amount));
    return { total, items };
  }

  async categories(userId: string, q: CategoryReportQueryDto) {
    const { from, to } = this.rangeOf(q);
    const result = await this.categoryBreakdown(userId, q.type, from, to);
    return { range: { from: toDateOnly(from), to: toDateOnly(to) }, type: q.type, ...result };
  }

  async cashFlowPoints(userId: string, from: Date, to: Date) {
    const rows = await this.fetchRows(userId, from, to);
    const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
    if (days <= DAILY_GRANULARITY_MAX_DAYS) {
      return { granularity: 'day' as const, points: withCumulative(bucketByDay(rows, from, to)) };
    }
    const months = bucketByMonth(rows, from, to).map((m) => ({ period: m.month, income: m.income, expense: m.expense }));
    return { granularity: 'month' as const, points: withCumulative(months) };
  }

  async cashFlow(userId: string, q: ReportQueryDto) {
    const { from, to } = this.rangeOf(q);
    const result = await this.cashFlowPoints(userId, from, to);
    return { range: { from: toDateOnly(from), to: toDateOnly(to) }, ...result };
  }

  async netWorth(userId: string) {
    const [accounts, debts] = await Promise.all([
      this.prisma.account.findMany({
        where: { userId, isActive: true },
        select: { id: true, name: true, type: true, balance: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.debt.findMany({
        where: { userId, status: 'OPEN' },
        select: { type: true, totalAmount: true, paidAmount: true },
      }),
    ]);
    return { ...computeNetWorth(accounts, debts), accounts };
  }
}
