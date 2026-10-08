'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { Todo } from './types';

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
 * In-app fallback while the app is open: shows a toast when a reminder time passes.
 * Only enabled when push notifications are NOT active (otherwise the phone already notifies the user).
 */
export function useTodoReminderToasts(todos: Todo[] | undefined, enabled: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled || !todos) return;
    const alerted = loadAlerted();
    const now = Date.now();
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
  }, [todos, enabled, router]);
}
