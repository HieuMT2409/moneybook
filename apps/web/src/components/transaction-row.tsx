'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { formatDate, formatSigned } from '@/lib/format';
import type { Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

export function TransactionRow({ tx, onEdit, onDelete }: { tx: Transaction; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
        style={{ backgroundColor: `${tx.category.color ?? '#64748b'}1f` }}
        aria-hidden
      >
        {tx.category.icon ?? '💸'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{tx.note || tx.category.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDate(tx.transactionDate)} · {tx.category.name} · {tx.account.name}
        </p>
      </div>
      <p className={cn('shrink-0 text-sm font-semibold tabular-nums', tx.type === 'INCOME' ? 'text-success' : 'text-danger')}>
        {formatSigned(tx.amount, tx.type)}
      </p>
      {onEdit || onDelete ? (
        <div className="flex shrink-0 gap-1">
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
