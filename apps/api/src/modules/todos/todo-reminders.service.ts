import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { buildReminderPayload } from './reminder';

const BATCH_SIZE = 100;

@Injectable()
export class TodoRemindersService {
  private readonly logger = new Logger(TodoRemindersService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  /** Every minute. If the server was asleep, overdue reminders are sent as soon as it wakes up. */
  @Cron(CronExpression.EVERY_MINUTE)
  async run(): Promise<void> {
    if (this.running) return; // never overlap with a slow previous run
    this.running = true;
    try {
      const sent = await this.dispatchDue();
      if (sent > 0) this.logger.log(`Sent ${sent} todo reminder(s)`);
    } catch (error) {
      this.logger.error('Reminder run failed', error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
  }

  async dispatchDue(now: Date = new Date()): Promise<number> {
    const due = await this.prisma.todo.findMany({
      where: { isDone: false, notifiedAt: null, remindAt: { lte: now } },
      orderBy: { remindAt: 'asc' },
      take: BATCH_SIZE,
    });

    let processed = 0;
    for (const todo of due) {
      // "Claim" the reminder first: only one run can flip notifiedAt from NULL, so a todo is never notified twice.
      const claimed = await this.prisma.todo.updateMany({
        where: { id: todo.id, notifiedAt: null, isDone: false },
        data: { notifiedAt: now },
      });
      if (claimed.count === 0) continue;
      await this.push.sendToUser(todo.userId, buildReminderPayload(todo, now));
      processed += 1;
    }
    return processed;
  }
}
