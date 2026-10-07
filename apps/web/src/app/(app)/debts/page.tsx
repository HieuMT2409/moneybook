'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
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
import { formatDate, formatMoney, todayInput } from '@/lib/format';
import { useAccounts, useApiMutation, useDebtDetail, useDebts } from '@/lib/queries';
import type { Debt } from '@/lib/types';
import { cn } from '@/lib/utils';

const money = z.string().regex(/^\d+$/, 'Nhập số tiền hợp lệ').refine((v) => !/^0+$/.test(v), 'Phải lớn hơn 0');
const debtSchema = z.object({
  personName: z.string().trim().min(1, 'Nhập tên').max(100),
  type: z.enum(['LEND', 'BORROW']),
  totalAmount: money,
  dueDate: z.string(),
  note: z.string().max(255),
});
type DebtValues = z.infer<typeof debtSchema>;

export default function DebtsPage() {
  const { data, isLoading, error, refetch } = useDebts();
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState<Debt | null>(null);
  const [toDelete, setToDelete] = useState<Debt | null>(null);
  const remove = useApiMutation((id: string) => api(`/debts/${id}`, { method: 'DELETE' }), 'Đã xóa khoản nợ');

  const open = (data ?? []).filter((d) => d.status === 'OPEN');
  const receivable = open.filter((d) => d.type === 'LEND').reduce((s, d) => s + Number(d.remainingAmount), 0);
  const payable = open.filter((d) => d.type === 'BORROW').reduce((s, d) => s + Number(d.remainingAmount), 0);

  return (
    <>
      <PageHeader title="Sổ nợ" description="Khoản phải thu và phải trả" actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Thêm</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Phải thu (cho vay)</p><p className="text-lg font-bold text-success tabular-nums">{formatMoney(receivable)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Phải trả (đi vay)</p><p className="text-lg font-bold text-danger tabular-nums">{formatMoney(payable)}</p></Card>
      </div>

      {isLoading ? <LoadingState /> : null}
      {error ? <ErrorState error={error} onRetry={() => refetch()} /> : null}
      {data && data.length === 0 ? <EmptyState title="Chưa có khoản nợ nào" description="Ghi lại tiền bạn cho mượn hoặc đã mượn." action={<Button onClick={() => setCreating(true)}>Thêm khoản nợ</Button>} /> : null}

      <div className="space-y-3">
        {(data ?? []).map((d) => (
          <DebtCard key={d.id} debt={d} onPay={() => setPaying(d)} onDelete={() => setToDelete(d)} />
        ))}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>{creating ? <DebtForm onDone={() => setCreating(false)} /> : null}</DialogContent>
      </Dialog>
      <Dialog open={paying !== null} onOpenChange={(o) => !o && setPaying(null)}>
        <DialogContent>{paying ? <PaymentForm debt={paying} onDone={() => setPaying(null)} /> : null}</DialogContent>
      </Dialog>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Xóa khoản nợ "${toDelete?.personName}"?`}
        description="Lịch sử trả nợ sẽ bị xóa; các khoản đã cộng/trừ vào tài khoản sẽ được hoàn lại."
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSettled: () => setToDelete(null) })}
      />
    </>
  );
}

function DebtCard({ debt: d, onPay, onDelete }: { debt: Debt; onPay: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const detail = useDebtDetail(d.id, expanded);
  const percent = Number(d.totalAmount) > 0 ? (Number(d.paidAmount) / Number(d.totalAmount)) * 100 : 0;
  const isLend = d.type === 'LEND';

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{d.personName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant={isLend ? 'success' : 'warning'}>{isLend ? 'Cho vay' : 'Đi vay'}</Badge>
            {d.status === 'SETTLED' ? <Badge variant="neutral">Đã tất toán</Badge> : null}
            {d.isOverdue ? <Badge variant="danger">Quá hạn</Badge> : null}
            {d.dueDate ? <span className="text-xs text-muted-foreground">Hạn {formatDate(d.dueDate)}</span> : null}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Xóa"><Trash2 className="h-4 w-4 text-danger" /></Button>
      </div>
      <Progress value={percent} className="mt-3" barClassName={isLend ? 'bg-success' : 'bg-warning'} />
      <div className="mt-2 grid grid-cols-3 text-xs">
        <div><p className="text-muted-foreground">{isLend ? 'Cho vay' : 'Đi vay'}</p><p className="font-medium tabular-nums">{formatMoney(d.totalAmount)}</p></div>
        <div><p className="text-muted-foreground">Đã trả</p><p className="font-medium tabular-nums">{formatMoney(d.paidAmount)}</p></div>
        <div className="text-right"><p className="text-muted-foreground">Còn</p><p className="font-semibold tabular-nums">{formatMoney(d.remainingAmount)}</p></div>
      </div>
      {d.note ? <p className="mt-2 text-xs text-muted-foreground">{d.note}</p> : null}
      <div className="mt-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setExpanded((e) => !e)}>
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} /> Lịch sử trả
        </Button>
        {d.status === 'OPEN' ? <Button size="sm" onClick={onPay}>Ghi nhận trả</Button> : null}
      </div>
      {expanded ? (
        <div className="mt-2 divide-y divide-border rounded-lg bg-muted/50 text-sm">
          {detail.isLoading ? <p className="p-3 text-muted-foreground">Đang tải…</p> : null}
          {detail.data && (detail.data.payments ?? []).length === 0 ? <p className="p-3 text-muted-foreground">Chưa có lần trả nào</p> : null}
          {(detail.data?.payments ?? []).map((p) => (
            <div key={p.id} className="flex justify-between gap-2 p-3">
              <span>{formatDate(p.paidAt)}{p.account ? ` · ${p.account.name}` : ''}{p.note ? ` · ${p.note}` : ''}</span>
              <span className="font-medium tabular-nums">{formatMoney(p.amount)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function DebtForm({ onDone }: { onDone: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<DebtValues>({
    resolver: zodResolver(debtSchema),
    defaultValues: { personName: '', type: 'LEND', totalAmount: '', dueDate: '', note: '' },
  });
  const save = useApiMutation(
    (v: DebtValues) => api('/debts', { method: 'POST', body: { ...v, dueDate: v.dueDate || undefined, note: v.note || undefined } }),
    'Đã thêm khoản nợ',
  );
  return (
    <form onSubmit={handleSubmit((v) => save.mutateAsync(v).then(onDone, () => undefined))} className="space-y-4" noValidate>
      <DialogHeader title="Thêm khoản nợ" />
      <Field label="Loại"><Select {...register('type')}><option value="LEND">Cho vay (người khác nợ tôi)</option><option value="BORROW">Đi vay (tôi nợ người khác)</option></Select></Field>
      <Field label="Tên người" error={errors.personName?.message}><Input {...register('personName')} placeholder="Nguyễn Văn A" autoFocus /></Field>
      <Field label="Số tiền" error={errors.totalAmount?.message}><Input {...register('totalAmount')} inputMode="numeric" placeholder="1000000" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Hạn trả (tùy chọn)"><Input type="date" {...register('dueDate')} /></Field>
        <Field label="Ghi chú" error={errors.note?.message}><Input {...register('note')} /></Field>
      </div>
      <p className="text-xs text-muted-foreground">Tạo khoản nợ không làm thay đổi số dư tài khoản. Số dư chỉ thay đổi khi bạn ghi nhận trả nợ và chọn tài khoản.</p>
      <Button type="submit" className="w-full" disabled={save.isPending}>{save.isPending ? 'Đang lưu…' : 'Lưu'}</Button>
    </form>
  );
}

function PaymentForm({ debt, onDone }: { debt: Debt; onDone: () => void }) {
  const accounts = useAccounts();
  const schema = z.object({
    amount: money.refine((v) => Number(v) <= Number(debt.remainingAmount), `Tối đa ${formatMoney(debt.remainingAmount)}`),
    paidAt: z.string().min(1, 'Chọn ngày'),
    accountId: z.string(),
    note: z.string().max(255),
  });
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { amount: String(Math.round(Number(debt.remainingAmount))), paidAt: todayInput(), accountId: '', note: '' },
  });
  const save = useApiMutation(
    (v: Values) => api(`/debts/${debt.id}/payments`, { method: 'POST', body: { ...v, accountId: v.accountId || undefined, note: v.note || undefined } }),
    'Đã ghi nhận thanh toán',
  );
  return (
    <form onSubmit={handleSubmit((v) => save.mutateAsync(v).then(onDone, () => undefined))} className="space-y-4" noValidate>
      <DialogHeader title={`Trả nợ: ${debt.personName}`} description={`Còn lại ${formatMoney(debt.remainingAmount)}`} />
      <Field label="Số tiền" error={errors.amount?.message}><Input {...register('amount')} inputMode="numeric" autoFocus /></Field>
      <Field label="Ngày" error={errors.paidAt?.message}><Input type="date" {...register('paidAt')} /></Field>
      <Field label="Tài khoản (tùy chọn)" hint={debt.type === 'LEND' ? 'Nếu chọn, tiền sẽ được cộng vào tài khoản này.' : 'Nếu chọn, tiền sẽ bị trừ khỏi tài khoản này.'}>
        <Select {...register('accountId')}>
          <option value="">Không ghi vào tài khoản nào</option>
          {(accounts.data ?? []).filter((a) => a.isActive).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </Field>
      <Field label="Ghi chú" error={errors.note?.message}><Input {...register('note')} /></Field>
      <Button type="submit" className="w-full" disabled={save.isPending}>{save.isPending ? 'Đang lưu…' : 'Xác nhận'}</Button>
    </form>
  );
}
