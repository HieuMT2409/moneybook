import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { buildReminderPayload, computeReminder } from './reminder';
import { TodoRemindersService } from './todo-reminders.service';
import { TodosService } from './todos.service';

const at = (iso: string) => new Date(iso);
const NOW = at('2026-10-07T10:00:00.000Z');

describe('computeReminder', () => {
  it('no due date -> never reminds', () => {
    expect(computeReminder(null, 15, NOW)).toEqual({ remindAt: null, notifiedAt: null });
  });

  it('reminds at due time minus the lead time', () => {
    const r = computeReminder(at('2026-10-07T12:00:00.000Z'), 30, NOW);
    expect(r.remindAt).toEqual(at('2026-10-07T11:30:00.000Z'));
    expect(r.notifiedAt).toBeNull();
  });

  it('lead time already passed -> falls back to the due moment', () => {
    const r = computeReminder(at('2026-10-07T10:10:00.000Z'), 60, NOW);
    expect(r.remindAt).toEqual(at('2026-10-07T10:10:00.000Z'));
    expect(r.notifiedAt).toBeNull();
  });

  it('due date in the past -> marked as notified, so nothing is sent about the past', () => {
    const r = computeReminder(at('2026-10-07T09:00:00.000Z'), 0, NOW);
    expect(r.notifiedAt).toEqual(NOW);
  });
});

describe('buildReminderPayload', () => {
  it('formats the due time in Vietnam time (UTC+7)', () => {
    const p = buildReminderPayload({ id: 'x', title: 'Đóng tiền nhà', dueAt: at('2026-10-07T03:00:00.000Z'), remindBeforeMinutes: 0 }, at('2026-10-07T03:00:00.000Z'));
    expect(p.title).toBe('⏰ Đóng tiền nhà');
    expect(p.body).toContain('10:00');
    expect(p.tag).toBe('todo-x');
  });
});

describe('TodoRemindersService.dispatchDue', () => {
  function setup(claimCount: number) {
    const todo = { id: 't1', userId: 'u1', title: 'Gọi điện', dueAt: NOW, remindBeforeMinutes: 0 };
    const prisma = {
      todo: { findMany: jest.fn().mockResolvedValue([todo]), updateMany: jest.fn().mockResolvedValue({ count: claimCount }) },
    };
    const push = { sendToUser: jest.fn().mockResolvedValue(1) };
    const service = new TodoRemindersService(prisma as unknown as PrismaService, push as unknown as PushService);
    return { prisma, push, service };
  }

  it('claims the reminder, then pushes to the owner', async () => {
    const { prisma, push, service } = setup(1);
    expect(await service.dispatchDue(NOW)).toBe(1);
    expect(prisma.todo.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ notifiedAt: null }) }));
    expect(push.sendToUser).toHaveBeenCalledWith('u1', expect.objectContaining({ tag: 'todo-t1' }));
  });

  it('does NOT push when another run already claimed it (no duplicate notifications)', async () => {
    const { push, service } = setup(0);
    expect(await service.dispatchDue(NOW)).toBe(0);
    expect(push.sendToUser).not.toHaveBeenCalled();
  });

  it('only looks at open, not-yet-notified todos whose reminder time has come', async () => {
    const { prisma, service } = setup(1);
    await service.dispatchDue(NOW);
    expect(prisma.todo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isDone: false, notifiedAt: null, remindAt: { lte: NOW } } }),
    );
  });
});

describe('TodosService', () => {
  it("user B cannot update or delete user A's todo (404)", async () => {
    const prisma = { todo: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service = new TodosService(prisma as unknown as PrismaService);
    await expect(service.update('user-b', 'todo-a', { isDone: true })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('user-b', 'todo-a')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.todo.findFirst).toHaveBeenCalledWith({ where: { id: 'todo-a', userId: 'user-b' } });
  });

  it('re-arms the reminder when a finished task is reopened with a future due date', async () => {
    const existing = { id: 't', userId: 'u', title: 'x', dueAt: new Date(Date.now() + 3_600_000), remindBeforeMinutes: 0, isDone: true };
    const update = jest.fn().mockResolvedValue({});
    const prisma = { todo: { findFirst: jest.fn().mockResolvedValue(existing), update } };
    await new TodosService(prisma as unknown as PrismaService).update('u', 't', { isDone: false });
    const data = update.mock.calls[0][0].data;
    expect(data.isDone).toBe(false);
    expect(data.doneAt).toBeNull();
    expect(data.notifiedAt).toBeNull();
    expect(data.remindAt).toEqual(existing.dueAt);
  });
});
