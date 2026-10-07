'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useApiMutation, useCategories } from '@/lib/queries';
import type { Category } from '@/lib/types';
import { ConfirmDialog } from './confirm-dialog';
import { ErrorState, LoadingState } from './states';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader } from './ui/dialog';
import { Field } from './ui/field';
import { Input, Select } from './ui/input';

const schema = z.object({
  name: z.string().trim().min(1, 'Nhập tên').max(40),
  type: z.enum(['INCOME', 'EXPENSE']),
  icon: z.string().max(8),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
type Values = z.infer<typeof schema>;

export function CategoriesSection() {
  const { data, isLoading, error, refetch } = useCategories();
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const remove = useApiMutation((id: string) => api(`/categories/${id}`, { method: 'DELETE' }), 'Đã xóa danh mục');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Danh mục</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Thêm</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <LoadingState rows={2} /> : null}
        {error ? <ErrorState error={error} onRetry={() => refetch()} /> : null}
        {(['EXPENSE', 'INCOME'] as const).map((type) => (
          <div key={type} className="mb-4 last:mb-0">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{type === 'EXPENSE' ? 'Chi tiêu' : 'Thu nhập'}</p>
            <div className="flex flex-wrap gap-2">
              {(data ?? []).filter((c) => c.type === type).map((c) => (
                <span key={c.id} className="group inline-flex items-center gap-1.5 rounded-full border border-border py-1 pl-2.5 pr-1 text-sm">
                  <span>{c.icon}</span>{c.name}
                  <button onClick={() => setToDelete(c)} aria-label={`Xóa ${c.name}`} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-danger"><Trash2 className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>{creating ? <CategoryForm onDone={() => setCreating(false)} /> : null}</DialogContent>
      </Dialog>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Xóa danh mục "${toDelete?.name}"?`}
        description="Chỉ xóa được danh mục chưa được dùng trong giao dịch hay giao dịch định kỳ."
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSettled: () => setToDelete(null) })}
      />
    </Card>
  );
}

function CategoryForm({ onDone }: { onDone: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', type: 'EXPENSE', icon: '🏷️', color: '#0f766e' },
  });
  const save = useApiMutation((v: Values) => api('/categories', { method: 'POST', body: v }), 'Đã thêm danh mục');
  return (
    <form onSubmit={handleSubmit((v) => save.mutateAsync(v).then(onDone, () => undefined))} className="space-y-4" noValidate>
      <DialogHeader title="Thêm danh mục" />
      <Field label="Loại"><Select {...register('type')}><option value="EXPENSE">Chi tiêu</option><option value="INCOME">Thu nhập</option></Select></Field>
      <Field label="Tên" error={errors.name?.message}><Input {...register('name')} autoFocus /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Biểu tượng (emoji)" error={errors.icon?.message}><Input {...register('icon')} /></Field>
        <Field label="Màu"><Input type="color" {...register('color')} className="p-1" /></Field>
      </div>
      <Button type="submit" className="w-full" disabled={save.isPending}>{save.isPending ? 'Đang lưu…' : 'Lưu'}</Button>
    </form>
  );
}
