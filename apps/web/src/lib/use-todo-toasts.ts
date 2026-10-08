'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { Todo } from './types';
import { useNow } from './use-now';

const STORAGE_KEY = 'moneybook_alerted_todos';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function loadAlerted(): Set<string> {
  try {
    return new Set<string>(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

/**
 * In-app reminder while the app is open: shows a toast when a reminder time passes.
 * Independent of Web Push, so it works even if system notifications are blocked.
 */
export function useTodoReminderToasts(todos: Todo[] | undefined, enabled: boolean) {
  const router = useRouter();
  // Re-run the check as time passes, not only when the todo list changes.
  const now = useNow(10_000);

  useEffect(() => {
    if (!enabled || !todos) return;
    const alerted = loadAlerted();
    let changed = false;

    for (const todo of todos) {
      if (todo.isDone || !todo.remindAt || alerted.has(todo.id)) continue;
      const remindAt = new Date(todo.remindAt).getTime();
      const createdAt = new Date(todo.createdAt).getTime();
      // Skip: not due yet, too old to matter, or scheduled in the past at creation time.
      if (remindAt > now || remindAt < now - MAX_AGE_MS || remindAt <= createdAt) continue;

      toast(`⏰ ${todo.title}`, {
        description: 'Đã đến giờ làm việc này',
        duration: 20_000,
        action: { label: 'Xem', onClick: () => router.push('/todos') },
      });
      alerted.add(todo.id);
      changed = true;
    }
    if (changed) window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...alerted].slice(-200)));
  }, [todos, enabled, router, now]);
}
