'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Play, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { api } from '@/lib/api';
import { formatDate, formatSigned, todayInput } from '@/lib/format';
import { useAccounts, useApiMutation, useCategories, useRecurring } from '@/lib/queries';
import type { Recurring } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from './confirm-dialog';
import { EmptyState, ErrorState, LoadingState } from './states';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader } from './ui/dialog';
import { Field } from './ui/field';
import { Input, Select } from './ui/input';

const FREQ: Record<string, string> = { DAILY: 'Hằng ngày', WEEKLY: 'Hằng tuần', MONTHLY: 'Hằng tháng', YEARLY: 'Hằng năm' };

const schema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.string().regex(/^\d+$/, 'Nhập số tiền hợp lệ').refine((v) => !/^0+$/.test(v), 'Phải lớn hơn 0'),
  accountId: z.string().min(1, 'Chọn tài khoản'),
  categoryId: z.string().min(1, 'Chọn danh mục'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  startDate: z.string().min(1, 'Chọn ngày bắt đầu'),
  endDate: z.string(),
  note: z.string().max(255),
});
type Values = z.infer<typeof schema>;

export function RecurringSection() {
  const { data, isLoading, error, refetch } = useRecurring();
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Recurring | null>(null);

  const toggle = useApiMutation((r: Recurring) => api(`/recurring/${r.id}`, { method: 'PATCH', body: { isActive: !r.isActive } }));
  const remove = useApiMutation((id: string) => api(`/recurring/${id}`, { method: 'DELETE' }), 'Đã xóa giao dịch định kỳ');
  const run = useApiMutation(() => api<{ created: number }>('/recurring/run', { method: 'POST' }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Giao dịch định kỳ</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={run.isPending} onClick={() => run.mutate(undefined, { onSuccess: (r) => toast.success(r.created ? `Đã tạo ${r.created} giao dịch` : 'Không có giao dịch nào đến hạn') })}>
            <Play className="h-3.5 w-3.5" /> Chạy ngay
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Thêm</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? <LoadingState rows={2} /> : null}
        {error ? <ErrorState error={error} onRetry={() => refetch()} /> : null}
        {data && data.length === 0 ? <EmptyState title="Chưa có giao dịch định kỳ" description="Ví dụ: lương ngày 5, tiền nhà ngày 1 hằng tháng." /> : null}
        {(data ?? []).map((r) => (
          <div key={r.id} className={cn('flex items-center gap-3 rounded-lg border border-border p-3', !r.isActive && 'opacity-60')}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.note || r.category.name}</p>
              <p className="truncate text-xs text-muted-foreground">{FREQ[r.frequency]} · {r.account.name} · Lần tới {formatDate(r.nextRunAt)}</p>
            </div>
            <p className={cn('text-sm font-semibold tabular-nums', r.type === 'INCOME' ? 'text-success' : 'text-danger')}>{formatSigned(r.amount, r.type)}</p>
            <Button variant="ghost" size="sm" onClick={() => toggle.mutate(r)}>{r.isActive ? <Badge variant="success">Bật</Badge> : <Badge>Tắt</Badge>}</Button>
            <Button variant="ghost" size="icon" onClick={() => setToDelete(r)} aria-label="Xóa"><Trash2 className="h-4 w-4 text-danger" /></Button>
          </div>
        ))}
      </CardContent>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>{creating ? <RecurringForm onDone={() => setCreating(false)} /> : null}</DialogContent>
      </Dialog>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Xóa giao dịch định kỳ?"
        description="Các giao dịch đã được tạo trước đó vẫn được giữ lại."
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSettled: () => setToDelete(null) })}
      />
    </Card>
  );
}

function RecurringForm({ onDone }: { onDone: () => void }) {
  const accounts = useAccounts();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'EXPENSE', amount: '', accountId: '', categoryId: '', frequency: 'MONTHLY', startDate: todayInput(), endDate: '', note: '' },
  });
  const type = watch('type');
  const categories = useCategories(type);
  const save = useApiMutation(
    (v: Values) => api('/recurring', { method: 'POST', body: { ...v, endDate: v.endDate || undefined, note: v.note || undefined } }),
    'Đã tạo giao dịch định kỳ',
  );
  return (
    <form onSubmit={handleSubmit((v) => save.mutateAsync(v).then(onDone, () => undefined))} className="space-y-4" noValidate>
      <DialogHeader title="Thêm giao dịch định kỳ" description="Hệ thống tự tạo giao dịch khi đến hạn (kể cả các kỳ bị lỡ)." />
      <Field label="Loại">
        <Select {...register('type', { onChange: () => setValue('categoryId', '') })}><option value="EXPENSE">Chi tiêu</option><option value="INCOME">Thu nhập</option></Select>
      </Field>
      <Field label="Số tiền" error={errors.amount?.message}><Input {...register('amount')} inputMode="numeric" placeholder="3000000" /></Field>
      <Field label="Danh mục" error={errors.categoryId?.message}>
        <Select {...register('categoryId')}><option value="">Chọn danh mục</option>{(categories.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</Select>
      </Field>
      <Field label="Tài khoản" error={errors.accountId?.message}>
        <Select {...register('accountId')}><option value="">Chọn tài khoản</option>{(accounts.data ?? []).filter((a) => a.isActive).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tần suất"><Select {...register('frequency')}>{Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Bắt đầu từ" error={errors.startDate?.message} hint="Ngày trong tháng của ngày này sẽ được giữ cố định."><Input type="date" {...register('startDate')} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kết thúc (tùy chọn)"><Input type="date" {...register('endDate')} /></Field>
        <Field label="Ghi chú" error={errors.note?.message}><Input {...register('note')} placeholder="Lương" /></Field>
      </div>
      <Button type="submit" className="w-full" disabled={save.isPending}>{save.isPending ? 'Đang lưu…' : 'Lưu'}</Button>
    </form>
  );
}
