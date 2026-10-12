'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { formatDate, formatSigned } from '@/lib/format';
import type { Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

/**
 * Phone: the whole row is tappable (opens the edit form, which also has Delete), and the amount sits on the
 * title line so long notes have room. Desktop: explicit edit/delete buttons.
 */
export function TransactionRow({ tx, onEdit, onDelete }: { tx: Transaction; onEdit?: () => void; onDelete?: () => void }) {
  const interactive = Boolean(onEdit);
  return (
    <div
      className={cn('flex items-center gap-3 px-4 py-3', interactive && 'cursor-pointer active:bg-muted md:active:bg-transparent')}
      onClick={onEdit}
      onKeyDown={(e) => { if (onEdit && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onEdit(); } }}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
        style={{ backgroundColor: `${tx.category.color ?? '#64748b'}1f` }}
        aria-hidden
      >
        {tx.category.icon ?? '💸'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-sm font-medium">{tx.note || tx.category.name}</p>
          <p className={cn('shrink-0 text-sm font-semibold tabular-nums', tx.type === 'INCOME' ? 'text-success' : 'text-danger')}>
            {formatSigned(tx.amount, tx.type)}
          </p>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formatDate(tx.transactionDate)} · {tx.category.name} · {tx.account.name}
        </p>
      </div>
      {onEdit || onDelete ? (
        <div className="hidden shrink-0 gap-1 md:flex" onClick={(e) => e.stopPropagation()}>
          {onEdit ? (
            <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Sửa giao dịch">
              <Pencil className="h-4 w-4" />
            </Button>
          ) : null}
          {onDelete ? (
            <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Xóa giao dịch">
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
