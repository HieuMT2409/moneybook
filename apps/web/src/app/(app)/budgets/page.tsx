'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { useApiMutation, useBudgets, useCategories } from '@/lib/queries';
import type { Budget } from '@/lib/types';
import { cn } from '@/lib/utils';

const schema = z.object({
  categoryId: z.string().min(1, 'Chọn danh mục'),
  amount: z.string().regex(/^\d+$/, 'Nhập số tiền hợp lệ').refine((v) => !/^0+$/.test(v), 'Phải lớn hơn 0'),
});
type Values = z.infer<typeof schema>;

export default function BudgetsPage() {
  const now = new Date();
  const [cursor, setCursor] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const { data, isLoading, error, refetch } = useBudgets(cursor.month, cursor.year);
  const [editing, setEditing] = useState<Budget | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Budget | null>(null);
  const remove = useApiMutation((id: string) => api(`/budgets/${id}`, { method: 'DELETE' }), 'Đã xóa ngân sách');

  const shift = (delta: number) =>
    setCursor(({ month, year }) => {
      const d = new Date(year, month - 1 + delta, 1);
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    });

  const totalBudget = (data?.items ?? []).reduce((s, b) => s + Number(b.amount), 0);
  const totalSpent = (data?.items ?? []).reduce((s, b) => s + Number(b.spent), 0);

  return (
    <>
      <PageHeader title="Ngân sách" description="Giới hạn chi tiêu theo danh mục" actions={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Thêm</Button>} />
      <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card p-2">
        <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Tháng trước"><ChevronLeft className="h-4 w-4" /></Button>
        <div className="text-center">
          <p className="font-semibold">Tháng {cursor.month}/{cursor.year}</p>
          {data && data.items.length > 0 ? <p className="text-xs text-muted-foreground">Đã chi {formatMoney(totalSpent)} / {formatMoney(totalBudget)}</p> : null}
        </div>
        <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Tháng sau"><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {isLoading ? <LoadingState /> : null}
      {error ? <ErrorState error={error} onRetry={() => refetch()} /> : null}
      {data && data.items.length === 0 ? (
        <EmptyState title="Chưa có ngân sách cho tháng này" description="Đặt giới hạn cho các danh mục chi tiêu chính." action={<Button onClick={() => setEditing('new')}>Tạo ngân sách</Button>} />
      ) : null}

      <div className="space-y-3">
        {(data?.items ?? []).map((b) => (
          <Card key={b.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{b.category.icon}</span>
                <p className="font-medium">{b.category.name}</p>
                {b.status === 'WARNING' ? <Badge variant="warning"><TriangleAlert className="mr-1 h-3 w-3" /> Sắp hết</Badge> : null}
                {b.status === 'EXCEEDED' ? <Badge variant="danger">Vượt ngân sách</Badge> : null}
              </div>
              <div className="flex">
                <Button variant="ghost" size="icon" onClick={() => setEditing(b)} aria-label="Sửa"><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setToDelete(b)} aria-label="Xóa"><Trash2 className="h-4 w-4 text-danger" /></Button>
              </div>
            </div>
            <Progress
              value={b.percentUsed}
              className="mt-3"
              barClassName={cn(b.status === 'WARNING' && 'bg-warning', b.status === 'EXCEEDED' && 'bg-danger')}
            />
            <div className="mt-2 grid grid-cols-3 text-xs">
              <div><p className="text-muted-foreground">Ngân sách</p><p className="font-medium tabular-nums">{formatMoney(b.amount)}</p></div>
              <div><p className="text-muted-foreground">Đã chi ({b.percentUsed}%)</p><p className="font-medium tabular-nums">{formatMoney(b.spent)}</p></div>
              <div className="text-right"><p className="text-muted-foreground">Còn lại</p><p className={cn('font-medium tabular-nums', Number(b.remaining) < 0 && 'text-danger')}>{formatMoney(b.remaining)}</p></div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          {editing ? (
            <BudgetForm
              key={editing === 'new' ? 'new' : editing.id}
              budget={editing === 'new' ? null : editing}
              month={cursor.month} year={cursor.year}
              takenCategoryIds={(data?.items ?? []).map((b) => b.categoryId)}
              onDone={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Xóa ngân sách?"
        description={`Ngân sách "${toDelete?.category.name}" của tháng này sẽ bị xóa. Giao dịch không bị ảnh hưởng.`}
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSettled: () => setToDelete(null) })}
      />
    </>
  );
}

function BudgetForm({ budget, month, year, takenCategoryIds, onDone }: { budget: Budget | null; month: number; year: number; takenCategoryIds: string[]; onDone: () => void }) {
  const categories = useCategories('EXPENSE');
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { categoryId: budget?.categoryId ?? '', amount: budget ? String(Math.round(Number(budget.amount))) : '' },
  });
  const save = useApiMutation(
    (v: Values) =>
      budget
        ? api(`/budgets/${budget.id}`, { method: 'PATCH', body: { amount: v.amount } })
        : api('/budgets', { method: 'POST', body: { ...v, month, year } }),
    budget ? 'Đã cập nhật ngân sách' : 'Đã tạo ngân sách',
  );
  const options = (categories.data ?? []).filter((c) => budget || !takenCategoryIds.includes(c.id));
  return (
    <form onSubmit={handleSubmit((v) => save.mutateAsync(v).then(onDone, () => undefined))} className="space-y-4" noValidate>
      <DialogHeader title={budget ? 'Sửa ngân sách' : `Ngân sách tháng ${month}/${year}`} />
      <Field label="Danh mục" error={errors.categoryId?.message}>
        <Select {...register('categoryId')} disabled={Boolean(budget)}>
          <option value="">Chọn danh mục chi tiêu</option>
          {options.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </Select>
      </Field>
      <Field label="Hạn mức" error={errors.amount?.message}><Input {...register('amount')} inputMode="numeric" placeholder="3000000" /></Field>
      <Button type="submit" className="w-full" disabled={save.isPending}>{save.isPending ? 'Đang lưu…' : 'Lưu'}</Button>
    </form>
  );
}
