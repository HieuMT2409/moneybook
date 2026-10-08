export const REMIND_OPTIONS = [0, 5, 10, 15, 30, 60, 120, 1440] as const;

/**
 * Decides when a todo should notify.
 *  - no due date                       -> never
 *  - due date already passed           -> never (marked as notified so we don't spam about the past)
 *  - lead time already passed          -> notify at the due moment instead ("remind 15 min before" on a task due in 10 min)
 */
export function computeReminder(
  dueAt: Date | null,
  remindBeforeMinutes: number,
  now: Date = new Date(),
): { remindAt: Date | null; notifiedAt: Date | null } {
  if (!dueAt) return { remindAt: null, notifiedAt: null };
  if (dueAt <= now) return { remindAt: dueAt, notifiedAt: now };

  let remindAt = new Date(dueAt.getTime() - remindBeforeMinutes * 60_000);
  if (remindAt <= now) remindAt = dueAt;
  return { remindAt, notifiedAt: null };
}

const VN_TIME = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
});

export function buildReminderPayload(todo: { id: string; title: string; dueAt: Date | null; remindBeforeMinutes: number }, now: Date = new Date()) {
  const dueText = todo.dueAt ? VN_TIME.format(todo.dueAt) : '';
  const minutesLeft = todo.dueAt ? Math.round((todo.dueAt.getTime() - now.getTime()) / 60_000) : 0;
  const body =
    minutesLeft > 1 ? `Còn khoảng ${minutesLeft} phút nữa · hạn ${dueText}` : dueText ? `Đến giờ rồi · ${dueText}` : 'Đến giờ rồi';
  return { title: `⏰ ${todo.title}`, body, url: '/todos', tag: `todo-${todo.id}` };
}
