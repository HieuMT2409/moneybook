import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RecurringTransaction } from '@prisma/client';
import { applyBalanceDelta } from '../../common/balance';
import { nextOccurrence, parseDateOnly, todayVN } from '../../common/dates';
import { signedAmount, toDecimal } from '../../common/money';
import { requireAccount, requireCategory } from '../../common/ownership';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecurringDto, UpdateRecurringDto } from './dto/recurring.dto';

const MAX_CATCH_UP_PER_RULE = 400; // safety net against runaway loops (~13 months of daily rules)
const INCLUDE = {
  account: { select: { id: true, name: true } },
  category: { select: { id: true, name: true, icon: true, color: true } },
} as const;

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.recurringTransaction.findMany({
      where: { userId },
      include: INCLUDE,
      orderBy: [{ isActive: 'desc' }, { nextRunAt: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateRecurringDto) {
    const startDate = parseDateOnly(dto.startDate);
    const endDate = dto.endDate ? parseDateOnly(dto.endDate) : null;
    await requireAccount(this.prisma, userId, dto.accountId, { mustBeActive: true });
    await requireCategory(this.prisma, userId, dto.categoryId, dto.type);

    return this.prisma.recurringTransaction.create({
      data: {
        userId,
        accountId: dto.accountId,
        categoryId: dto.categoryId,
        type: dto.type,
        amount: toDecimal(dto.amount),
        frequency: dto.frequency,
        dayOfMonth: startDate.getUTCDate(),
        nextRunAt: startDate,
        endDate,
        note: dto.note?.trim() || null,
      },
      include: INCLUDE,
    });
  }

  async update(userId: string, id: string, dto: UpdateRecurringDto) {
    const existing = await this.prisma.recurringTransaction.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Recurring transaction not found');
    if (dto.accountId) await requireAccount(this.prisma, userId, dto.accountId, { mustBeActive: true });
    if (dto.categoryId) await requireCategory(this.prisma, userId, dto.categoryId, existing.type);

    return this.prisma.recurringTransaction.update({
      where: { id, userId },
      data: {
        ...(dto.amount ? { amount: toDecimal(dto.amount) } : {}),
        ...(dto.accountId ? { accountId: dto.accountId } : {}),
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        ...(dto.endDate ? { endDate: parseDateOnly(dto.endDate) } : {}),
        ...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: INCLUDE,
    });
  }

  async remove(userId: string, id: string): Promise<{ deleted: true }> {
    const existing = await this.prisma.recurringTransaction.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Recurring transaction not found');
    await this.prisma.recurringTransaction.delete({ where: { id, userId } }); // generated transactions keep existing
    return { deleted: true };
  }

  /** Daily safety net at 00:05 Vietnam time. */
  @Cron('5 0 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runScheduled(): Promise<void> {
    try {
      const { created } = await this.runDue();
      this.logger.log(`Recurring run finished: ${created} transaction(s) created`);
    } catch (error) {
      this.logger.error('Recurring run failed', error instanceof Error ? error.stack : String(error));
    }
  }

  /**
   * Creates every due occurrence (including ones missed while the server was asleep).
   * Pass a userId to process only that user's rules (manual run / lazy catch-up).
   */
  async runDue(userId?: string): Promise<{ created: number }> {
    const today = todayVN();
    const rules = await this.prisma.recurringTransaction.findMany({
      where: { isActive: true, nextRunAt: { lte: today }, ...(userId ? { userId } : {}) },
      include: { account: { select: { isActive: true } } },
    });

    let created = 0;
    for (const rule of rules) {
      try {
        created += await this.runRule(rule, rule.account.isActive, today);
      } catch (error) {
        // One broken rule must not block the others.
        this.logger.error(`Rule ${rule.id} failed`, error instanceof Error ? error.stack : String(error));
      }
    }
    return { created };
  }

  private async runRule(rule: RecurringTransaction, accountActive: boolean, today: Date): Promise<number> {
    if (!accountActive) return 0;
    let runAt = rule.nextRunAt;
    let created = 0;

    while (runAt <= today && (!rule.endDate || runAt <= rule.endDate) && created < MAX_CATCH_UP_PER_RULE) {
      const following = nextOccurrence(runAt, rule.frequency, rule.dayOfMonth);
      const occurrenceDate = runAt;

      const ok = await this.prisma.$transaction(async (tx) => {
        // "Claim" this occurrence: the update only matches if nobody else advanced the rule first,
        // so two parallel runs can never create the same occurrence twice.
        const claimed = await tx.recurringTransaction.updateMany({
          where: { id: rule.id, isActive: true, nextRunAt: occurrenceDate },
          data: { nextRunAt: following },
        });
        if (claimed.count === 0) return false;

        await tx.transaction.create({
          data: {
            userId: rule.userId,
            accountId: rule.accountId,
            categoryId: rule.categoryId,
            recurringId: rule.id,
            type: rule.type,
            amount: rule.amount,
            note: rule.note,
            transactionDate: occurrenceDate,
          },
        });
        await applyBalanceDelta(tx, rule.userId, rule.accountId, signedAmount(rule.type, rule.amount));
        return true;
      });

      if (!ok) break;
      created += 1;
      runAt = following;
    }

    if (rule.endDate && runAt > rule.endDate) {
      await this.prisma.recurringTransaction.updateMany({ where: { id: rule.id }, data: { isActive: false } });
    }
    return created;
  }
}
