'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Banknote, CreditCard, Landmark, Pencil, Plus, Smartphone, Trash2, Wallet } from 'lucide-react';
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
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { useAccounts, useApiMutation } from '@/lib/queries';
import type { Account, AccountType } from '@/lib/types';
import { cn } from '@/lib/utils';

const TYPES: Record<AccountType, { label: string; icon: typeof Wallet }> = {
  CASH: { label: 'Tiền mặt', icon: Banknote },
  BANK: { label: 'Ngân hàng', icon: Landmark },
  EWALLET: { label: 'Ví điện tử', icon: Smartphone },
  CREDIT_CARD: { label: 'Thẻ tín dụng', icon: CreditCard },
  OTHER: { label: 'Khác', icon: Wallet },
};

const schema = z.object({
  name: z.string().trim().min(1, 'Nhập tên tài khoản').max(60),
  type: z.enum(['CASH', 'BANK', 'EWALLET', 'CREDIT_CARD', 'OTHER']),
  initialBalance: z.string().regex(/^-?\d+$/, 'Nhập số nguyên (có thể âm)'),
});
type Values = z.infer<typeof schema>;

export default function AccountsPage() {
  const { data, isLoading, error, refetch } = useAccounts();
  const [editing, setEditing] = useState<Account | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Account | null>(null);

  const toggle = useApiMutation((a: Account) => api(`/accounts/${a.id}`, { method: 'PATCH', body: { isActive: !a.isActive } }), 'Đã cập nhật tài khoản');
  const remove = useApiMutation((id: string) => api(`/accounts/${id}`, { method: 'DELETE' }), 'Đã xóa tài khoản');

  return (
    <>
      <PageHeader
        title="Tài khoản"
        description="Ví và tài khoản tiền của bạn"
        actions={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Thêm</Button>}
      />
      {isLoading ? <LoadingState /> : null}
      {error ? <ErrorState error={error} onRetry={() => refetch()} /> : null}
      {data && data.length === 0 ? (
        <EmptyState title="Chưa có tài khoản" description="Tạo ví hoặc tài khoản ngân hàng đầu tiên để bắt đầu ghi chép." action={<Button onClick={() => setEditing('new')}>Tạo tài khoản</Button>} />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {(data ?? []).map((a) => {
          const { label, icon: Icon } = TYPES[a.type];
          return (
            <Card key={a.id} className={cn('p-4', !a.isActive && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{label} · {a.currency}</p>
                  </div>
                </div>
                {!a.isActive ? <Badge>Đã tắt</Badge> : null}
              </div>
              <p className={cn('mt-3 text-xl font-bold tabular-nums', Number(a.balance) < 0 && 'text-danger')}>{formatMoney(a.balance)}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(a)}><Pencil className="h-3.5 w-3.5" /> Sửa</Button>
                <Button variant="ghost" size="sm" disabled={toggle.isPending} onClick={() => toggle.mutate(a)}>{a.isActive ? 'Tắt' : 'Bật lại'}</Button>
                <Button variant="ghost" size="sm" onClick={() => setToDelete(a)}><Trash2 className="h-3.5 w-3.5 text-danger" /> Xóa</Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          {editing ? <AccountForm key={editing === 'new' ? 'new' : editing.id} account={editing === 'new' ? null : editing} onDone={() => setEditing(null)} /> : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Xóa "${toDelete?.name}"?`}
        description="Chỉ xóa được tài khoản chưa có giao dịch. Nếu đã có giao dịch, hãy dùng nút Tắt để ẩn tài khoản."
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSettled: () => setToDelete(null) })}
      />
    </>
  );
}

function AccountForm({ account, onDone }: { account: Account | null; onDone: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: account?.name ?? '', type: account?.type ?? 'BANK', initialBalance: account ? String(Math.round(Number(account.initialBalance))) : '0' },
  });
  const save = useApiMutation(
    (v: Values) => api(account ? `/accounts/${account.id}` : '/accounts', { method: account ? 'PATCH' : 'POST', body: v }),
    account ? 'Đã cập nhật tài khoản' : 'Đã tạo tài khoản',
  );
  return (
    <form onSubmit={handleSubmit((v) => save.mutateAsync(v).then(onDone, () => undefined))} className="space-y-4" noValidate>
      <DialogHeader title={account ? 'Sửa tài khoản' : 'Thêm tài khoản'} />
      <Field label="Tên" error={errors.name?.message}><Input {...register('name')} placeholder="Vietcombank" autoFocus /></Field>
      <Field label="Loại" error={errors.type?.message}>
        <Select {...register('type')}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
      </Field>
      <Field label="Số dư ban đầu" error={errors.initialBalance?.message} hint={account ? 'Đổi số dư ban đầu sẽ điều chỉnh số dư hiện tại tương ứng.' : undefined}>
        <Input {...register('initialBalance')} inputMode="numeric" />
      </Field>
      <Button type="submit" className="w-full" disabled={save.isPending}>{save.isPending ? 'Đang lưu…' : 'Lưu'}</Button>
    </form>
  );
}
