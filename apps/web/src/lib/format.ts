// Display-only helpers. Money stays a string everywhere except for formatting and chart axes.
const nf = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

export function formatMoney(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return `${n < 0 ? '-' : ''}${nf.format(Math.abs(n))}đ`;
}

export function formatSigned(value: string | number, type: 'INCOME' | 'EXPENSE'): string {
  return `${type === 'INCOME' ? '+' : '-'}${formatMoney(Math.abs(Number(value)))}`;
}

export function compactMoney(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`;
  if (abs >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

/** API dates arrive as ISO strings (2026-10-01T00:00:00.000Z) -> '01/10/2026'. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

/** Today's date as YYYY-MM-DD in the user's local timezone. */
export function todayInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `T${Number(m)}/${y}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** An ISO instant shown in the user's local time: '08/10 14:30'. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO instant -> value for <input type="datetime-local"> (local time, no timezone suffix). */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
