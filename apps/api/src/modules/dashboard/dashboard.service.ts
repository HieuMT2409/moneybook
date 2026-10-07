import { Injectable, Logger } from '@nestjs/common';
import { addMonths, monthBounds, todayVN, toDateOnly } from '../../common/dates';
import { sumDecimals } from '../../common/money';
import { PrismaService } from '../../prisma/prisma.service';
import { RecurringService } from '../recurring/recurring.service';
import { ReportsService } from '../reports/reports.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
    private readonly recurring: RecurringService,
  ) {}

  async get(userId: string) {
    // Lazy catch-up: on hosts that sleep (free tier) the cron may have been missed, so make sure
    // this user's due recurring transactions exist before we compute any totals.
    try {
      await this.recurring.runDue(userId);
    } catch (error) {
      this.logger.warn(`Recurring catch-up skipped: ${error instanceof Error ? error.message : String(error)}`);
    }

    const today = todayVN();
    const thisMonth = monthBounds(today.getUTCFullYear(), today.getUTCMonth() + 1);
    const prev = addMonths(today, -1);
    const lastMonth = monthBounds(prev.getUTCFullYear(), prev.getUTCMonth() + 1);
    const sixMonthsFrom = addMonths(today, -5);

    const [accounts, thisSummary, lastSummary, incomeVsExpense, expenseByCategory, cashFlow, recent, netWorth] =
      await Promise.all([
        this.prisma.account.findMany({ where: { userId, isActive: true }, select: { balance: true } }),
        this.reports.summary(userId, thisMonth.from, thisMonth.to),
        this.reports.summary(userId, lastMonth.from, lastMonth.to),
        this.reports.monthlySeries(userId, sixMonthsFrom, thisMonth.to),
        this.reports.categoryBreakdown(userId, 'EXPENSE', thisMonth.from, thisMonth.to),
        this.reports.cashFlowPoints(userId, thisMonth.from, thisMonth.to),
        this.prisma.transaction.findMany({
          where: { userId },
          orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
          take: 5,
          include: {
            account: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, icon: true, color: true } },
          },
        }),
        this.reports.netWorth(userId),
      ]);

    return {
      month: toDateOnly(thisMonth.from).slice(0, 7),
      totalBalance: sumDecimals(accounts.map((a) => a.balance)),
      netWorth: netWorth.netWorth,
      thisMonth: thisSummary,
      lastMonth: lastSummary,
      incomeVsExpense,
      expenseByCategory,
      cashFlow,
      monthlyComparison: [
        { label: 'last', income: lastSummary.income, expense: lastSummary.expense },
        { label: 'this', income: thisSummary.income, expense: thisSummary.expense },
      ],
      recentTransactions: recent,
    };
  }
}
