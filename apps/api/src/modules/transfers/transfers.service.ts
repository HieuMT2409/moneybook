import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { applyBalanceDelta } from '../../common/balance';
import { parseDateOnly } from '../../common/dates';
import { buildMeta, PaginationQueryDto } from '../../common/dto/pagination.dto';
import { toDecimal } from '../../common/money';
import { requireAccount } from '../../common/ownership';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransferDto } from './dto/transfer.dto';

const INCLUDE = {
  fromAccount: { select: { id: true, name: true } },
  toAccount: { select: { id: true, name: true } },
} as const;

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, q: PaginationQueryDto) {
    const [items, total] = await Promise.all([
      this.prisma.transfer.findMany({
        where: { userId },
        include: INCLUDE,
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.transfer.count({ where: { userId } }),
    ]);
    return { items, meta: buildMeta(q.page, q.pageSize, total) };
  }

  /** Source -amount, destination +amount, plus the Transfer row: all or nothing. */
  async create(userId: string, dto: CreateTransferDto) {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Source and destination accounts must be different');
    }
    const amount = toDecimal(dto.amount);
    const transactionDate = parseDateOnly(dto.transactionDate);

    return this.prisma.$transaction(async (tx) => {
      await requireAccount(tx, userId, dto.fromAccountId, { mustBeActive: true });
      await requireAccount(tx, userId, dto.toAccountId, { mustBeActive: true });

      const transfer = await tx.transfer.create({
        data: {
          userId,
          fromAccountId: dto.fromAccountId,
          toAccountId: dto.toAccountId,
          amount,
          note: dto.note?.trim() || null,
          transactionDate,
        },
        include: INCLUDE,
      });
      await applyBalanceDelta(tx, userId, dto.fromAccountId, amount.neg());
      await applyBalanceDelta(tx, userId, dto.toAccountId, amount);
      return transfer;
    });
  }

  remove(userId: string, id: string): Promise<{ deleted: true }> {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findFirst({ where: { id, userId } });
      if (!transfer) throw new NotFoundException('Transfer not found');
      await tx.transfer.delete({ where: { id, userId } });
      await applyBalanceDelta(tx, userId, transfer.fromAccountId, transfer.amount);
      await applyBalanceDelta(tx, userId, transfer.toAccountId, transfer.amount.neg());
      return { deleted: true as const };
    });
  }
}
