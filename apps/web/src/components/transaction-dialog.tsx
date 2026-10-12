'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '@/lib/api';
import { formatMoney, todayInput, toDateInput } from '@/lib/format';
import { useAccounts, useApiMutation, useCategories } from '@/lib/queries';
import type { Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader } from './ui/dialog';
import { Field } from './ui/field';
import { Input, Select } from './ui/input';

type FormType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

const schema = z
  .object({
    type: z.enum(['EXPENSE', 'INCOME', 'TRANSFER']),
    amount: z
      .string()
      .regex(/^\d+$/, 'Nhập số tiền hợp lệ')
      .refine((v) => !/^0+$/.test(v), 'Số tiền phải lớn hơn 0'),
    accountId: z.string().min(1, 'Chọn tài khoản'),
    toAccountId: z.string(),
    categoryId: z.string(),
    date: z.string().min(1, 'Chọn ngày'),
    note: z.string().max(255, 'Tối đa 255 ký tự'),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'TRANSFER') {
      if (!v.toAccountId) ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: 'Chọn tài khoản nhận' });
      else if (v.toAccountId === v.accountId) {
        ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: 'Tài khoản nguồn và đích phải khác nhau' });
      }
    } else if (!v.categoryId) {
      ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Chọn danh mục' });
    }
  });
type FormValues = z.infer<typeof schema>;

const TYPE_LABELS: Record<FormType, string> = { EXPENSE: 'Chi tiêu', INCOME: 'Thu nhập', TRANSFER: 'Chuyển tiền' };

interface DialogApi {
  openNew: (type?: FormType) => void;
  openEdit: (transaction: Transaction) => void;
}
const Ctx = createContext<DialogApi | null>(null);

export function useTransactionDialog(): DialogApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTransactionDialog must be used inside TransactionDialogProvider');
  return ctx;
}

export function TransactionDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; type: FormType; editing: Transaction | null }>({
    open: false, type: 'EXPENSE', editing: null,
  });
  const api_ = useMemo<DialogApi>(
    () => ({
      openNew: (type = 'EXPENSE') => setState({ open: true, type, editing: null }),
      openEdit: (editing) => setState({ open: true, type: editing.type, editing }),
    }),
    [],
  );
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  return (
    <Ctx.Provider value={api_}>
      {children}
      <Dialog open={state.open} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          {/* Remounted per open so the form always starts from fresh defaults. */}
          {state.open ? <TransactionForm key={state.editing?.id ?? `new-${state.type}`} initialType={state.type} editing={state.editing} onDone={close} /> : null}
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

function TransactionForm({ initialType, editing, onDone }: { initialType: FormType; editing: Transaction | null; onDone: () => void }) {
  const accounts = useAccounts();
  const activeAccounts = (accounts.data ?? []).filter((a) => a.isActive);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: initialType,
      amount: editing ? String(Math.round(Number(editing.amount))) : '',
      accountId: editing?.accountId ?? '',
      toAccountId: '',
      categoryId: editing?.categoryId ?? '',
      date: editing ? toDateInput(editing.transactionDate) : todayInput(),
      note: editing?.note ?? '',
    },
  });
  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const type = watch('type');
  const amount = watch('amount');
  const accountId = watch('accountId');

  const categories = useCategories(type === 'TRANSFER' ? undefined : type);

  // Default to the first active account so the common case needs fewer taps.
  useEffect(() => {
    if (!accountId && activeAccounts.length > 0) setValue('accountId', activeAccounts[0].id);
  }, [accountId, activeAccounts, setValue]);

  const mutation = useApiMutation(async (v: FormValues) => {
    if (v.type === 'TRANSFER') {
      return api('/transfers', {
        method: 'POST',
        body: { fromAccountId: v.accountId, toAccountId: v.toAccountId, amount: v.amount, transactionDate: v.date, note: v.note || undefined },
      });
    }
    const body = { type: v.type, amount: v.amount, accountId: v.accountId, categoryId: v.categoryId, transactionDate: v.date, note: v.note };
    return editing ? api(`/transactions/${editing.id}`, { method: 'PATCH', body }) : api('/transactions', { method: 'POST', body });
  }, editing ? 'Đã cập nhật giao dịch' : 'Đã thêm giao dịch');

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const remove = useApiMutation(() => api(`/transactions/${editing?.id ?? ''}`, { method: 'DELETE' }), 'Đã xóa giao dịch');

  const onSubmit = handleSubmit(async (values) => {
    await mutation.mutateAsync(values).then(onDone, () => undefined);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <DialogHeader title={editing ? 'Sửa giao dịch' : 'Thêm giao dịch'} />

      {!editing ? (
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" role="tablist">
          {(Object.keys(TYPE_LABELS) as FormType[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={type === t}
              onClick={() => {
                setValue('type', t);
                setValue('categoryId', ''); // categories differ between income and expense
              }}
              className={cn(
                'rounded-md py-1.5 text-sm font-medium transition-colors',
                type === t ? 'bg-card shadow-sm' : 'text-muted-foreground',
                type === t && t === 'EXPENSE' && 'text-danger',
                type === t && t === 'INCOME' && 'text-success',
              )}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      ) : null}

      <Field label="Số tiền" error={errors.amount?.message} hint={amount && /^\d+$/.test(amount) ? `= ${formatMoney(amount)}` : undefined}>
        <Input {...register('amount', { onChange: (e) => { e.target.value = e.target.value.replace(/\D/g, ''); } })} inputMode="numeric" placeholder="50000" autoFocus className="text-lg font-semibold" />
      </Field>

      {type !== 'TRANSFER' ? (
        <Field label="Danh mục" error={errors.categoryId?.message}>
          <Select {...register('categoryId')}>
            <option value="">Chọn danh mục</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Field label={type === 'TRANSFER' ? 'Từ tài khoản' : 'Tài khoản'} error={errors.accountId?.message}>
        <Select {...register('accountId')}>
          <option value="">Chọn tài khoản</option>
          {activeAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({formatMoney(a.balance)})
            </option>
          ))}
        </Select>
      </Field>

      {type === 'TRANSFER' ? (
        <Field label="Đến tài khoản" error={errors.toAccountId?.message}>
          <Select {...register('toAccountId')}>
            <option value="">Chọn tài khoản nhận</option>
            {activeAccounts.filter((a) => a.id !== accountId).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Ngày" error={errors.date?.message}>
          <Input type="date" {...register('date')} />
        </Field>
        <Field label="Ghi chú" error={errors.note?.message}>
          <Input {...register('note')} placeholder="Ăn trưa…" />
        </Field>
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Đang lưu…' : 'Lưu'}
      </Button>
      {editing ? (
        <Button
          type="button"
          variant={confirmingDelete ? 'destructive' : 'ghost'}
          className={cn('w-full', !confirmingDelete && 'text-danger')}
          disabled={remove.isPending}
          onClick={() => (confirmingDelete ? remove.mutateAsync().then(onDone, () => undefined) : setConfirmingDelete(true))}
        >
          {remove.isPending ? 'Đang xóa…' : confirmingDelete ? 'Bấm lần nữa để xác nhận xóa' : 'Xóa giao dịch'}
        </Button>
      ) : null}
    </form>
  );
}

