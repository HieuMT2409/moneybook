import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTodoDto, ListTodosQueryDto, UpdateTodoDto } from './dto/todo.dto';
import { computeReminder } from './reminder';

const MAX_ITEMS = 500;

@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, q: ListTodosQueryDto) {
    const where: Prisma.TodoWhereInput = { userId, ...(q.status === 'all' ? {} : { isDone: q.status === 'done' }) };
    return this.prisma.todo.findMany({
      where,
      orderBy:
        q.status === 'done'
          ? [{ doneAt: 'desc' }]
          : [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: MAX_ITEMS,
    });
  }

  async create(userId: string, dto: CreateTodoDto) {
    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    const remindBeforeMinutes = dto.remindBeforeMinutes ?? 0;
    return this.prisma.todo.create({
      data: {
        userId,
        title: dto.title.trim(),
        note: dto.note?.trim() || null,
        dueAt,
        remindBeforeMinutes,
        ...computeReminder(dueAt, remindBeforeMinutes),
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateTodoDto) {
    const existing = await this.prisma.todo.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Todo not found');

    const dueAt = dto.dueAt === undefined ? existing.dueAt : dto.dueAt === null ? null : new Date(dto.dueAt);
    const remindBeforeMinutes = dto.remindBeforeMinutes ?? existing.remindBeforeMinutes;
    const scheduleChanged =
      dto.dueAt !== undefined || dto.remindBeforeMinutes !== undefined || dto.isDone === false;

    const data: Prisma.TodoUpdateInput = {
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
      remindBeforeMinutes,
      dueAt,
    };
    if (dto.isDone !== undefined) {
      data.isDone = dto.isDone;
      data.doneAt = dto.isDone ? new Date() : null;
    }
    // Re-arm the reminder only when the schedule changes or a finished task is reopened.
    if (scheduleChanged) Object.assign(data, computeReminder(dueAt, remindBeforeMinutes));

    return this.prisma.todo.update({ where: { id, userId }, data });
  }

  async remove(userId: string, id: string): Promise<{ deleted: true }> {
    const existing = await this.prisma.todo.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Todo not found');
    await this.prisma.todo.delete({ where: { id, userId } });
    return { deleted: true };
  }
}
