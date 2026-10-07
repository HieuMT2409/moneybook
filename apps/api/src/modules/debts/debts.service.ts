import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Debt } from '@prisma/client';
import { applyBalanceDelta } from '../../common/balance';
import { parseDateOnly, todayVN } from '../../common/dates';
import { toDecimal } from '../../common/money';
import { requireAccount } from '../../common/ownership';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDebtDto, CreateDebtPaymentDto, ListDebtsQueryDto, UpdateDebtDto } from './dto/debt.dto';

@Injectable()
export class DebtsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, q: ListDebtsQueryDto) {
    const debts = await this.prisma.debt.findMany({
      where: { userId, ...(q.status ? { status: q.status } : {}), ...(q.type ? { type: q.type } : {}) },
      orderBy: [{ status: 'asc' }, { dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
    });
    return debts.map((d) => this.present(d));
  }

  async get(userId: string, id: string) {
    const debt = await this.prisma.debt.findFirst({
      where: { id, userId },
      include: {
        payments: { orderBy: { paidAt: 'desc' }, include: { account: { select: { id: true, name: true } } } },
      },
    });
    if (!debt) throw new NotFoundException('Debt not found');
    return { ...this.present(debt), payments: debt.payments };
  }

  async create(userId: string, dto: CreateDebtDto) {
    const debt = await this.prisma.debt.create({
      data: {
        userId,
        personName: dto.personName.trim(),
        type: dto.type,
        totalAmount: toDecimal(dto.totalAmount),
        dueDate: dto.dueDate ? parseDateOnly(dto.dueDate) : null,
        note: dto.note?.trim() || null,
      },
    });
    return this.present(debt);
  }

  async update(userId: string, id: string, dto: UpdateDebtDto) {
    const existing = await this.prisma.debt.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Debt not found');

    const total = dto.totalAmount !== undefined ? toDecimal(dto.totalAmount) : existing.totalAmount;
    if (total.lt(existing.paidAmount)) {
      throw new BadRequestException('Total amount cannot be lower than the amount already paid');
    }
    const debt = await this.prisma.debt.update({
      where: { id, userId },
      data: {
        ...(dto.personName ? { personName: dto.personName.trim() } : {}),
        ...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: parseDateOnly(dto.dueDate) } : {}),
        totalAmount: total,
        status: existing.paidAmount.gte(total) ? 'SETTLED' : 'OPEN',
      },
    });
    return this.present(debt);
  }

  /** Reverses any account movements made by this debt's payments, then deletes it - atomically. */
  remove(userId: string, id: string): Promise<{ deleted: true }> {
    return this.prisma.$transaction(async (tx) => {
      const debt = await tx.debt.findFirst({ where: { id, userId }, include: { payments: true } });
      if (!debt) throw new NotFoundException('Debt not found');
      for (const payment of debt.payments) {
        if (payment.accountId) {
          const delta = debt.type === 'LEND' ? payment.amount.neg() : payment.amount;
          await applyBalanceDelta(tx, userId, payment.accountId, delta);
        }
      }
      await tx.debt.delete({ where: { id, userId } });
      return { deleted: true as const };
    });
  }

  async addPayment(userId: string, debtId: string, dto: CreateDebtPaymentDto) {
    const amount = toDecimal(dto.amount);
    const paidAt = dto.paidAt ? parseDateOnly(dto.paidAt) : todayVN();

    return this.prisma.$transaction(async (tx) => {
      const debt = await tx.debt.findFirst({ where: { id: debtId, userId } });
      if (!debt) throw new NotFoundException('Debt not found');
      if (debt.status === 'SETTLED') throw new BadRequestException('Debt is already settled');

      const remaining = debt.totalAmount.minus(debt.paidAmount);
      if (amount.gt(remaining)) {
        throw new BadRequestException(`Payment exceeds the remaining amount (${remaining.toFixed(2)})`);
      }
      if (dto.accountId) await requireAccount(tx, userId, dto.accountId, { mustBeActive: true });

      // Optimistic lock: only update if paidAmount is still what we read (blocks double-spend races).
      const newPaid = debt.paidAmount.plus(amount);
      const updated = await tx.debt.updateMany({
        where: { id: debtId, userId, paidAmount: debt.paidAmount },
        data: { paidAmount: newPaid, status: newPaid.gte(debt.totalAmount) ? 'SETTLED' : 'OPEN' },
      });
      if (updated.count === 0) throw new ConflictException('Debt was modified concurrently, please retry');

      const payment = await tx.debtPayment.create({
        data: { debtId, userId, accountId: dto.accountId ?? null, amount, paidAt, note: dto.note?.trim() || null },
      });
      if (dto.accountId) {
        // LEND: the borrower pays me back (money in). BORROW: I pay them (money out).
        await applyBalanceDelta(tx, userId, dto.accountId, debt.type === 'LEND' ? amount : amount.neg());
      }
      return payment;
    });
  }

  private present(debt: Debt) {
    const remaining = debt.totalAmount.minus(debt.paidAmount);
    const isOverdue = debt.status === 'OPEN' && debt.dueDate !== null && debt.dueDate < todayVN();
    return { ...debt, remainingAmount: remaining, isOverdue };
  }
}
