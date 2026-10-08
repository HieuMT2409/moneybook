'use client';

import { useEffect, useState } from 'react';

/**
 * Current time as state, refreshed on an interval and whenever the tab becomes visible again.
 * Anything computed from "now" (overdue highlighting, reminder toasts) must depend on this value;
 * otherwise nothing re-renders when time passes and the UI only updates after an unrelated re-render.
 */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [intervalMs]);

  return now;
}
