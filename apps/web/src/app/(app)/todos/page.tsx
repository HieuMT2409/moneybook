'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { BellRing, Check, Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { NotificationsCard } from '@/components/notifications-card';
import { PageHeader } from '@/components/page-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatDateTime, toLocalInput } from '@/lib/format';
import { useApiMutation, useTodos } from '@/lib/queries';
import type { Todo } from '@/lib/types';
import { cn } from '@/lib/utils';

const REMIND_LABELS: Record<string, string> = {
  '0': 'Đúng giờ', '5': 'Trước 5 phút', '10': 'Trước 10 phút', '15': 'Trước 15 phút',
  '30': 'Trước 30 phút', '60': 'Trước 1 giờ', '120': 'Trước 2 giờ', '1440': 'Trước 1 ngày',
};

const schema = z.object({
  title: z.string().trim().min(1, 'Nhập nội dung việc cần làm').max(200),
  note: z.string().max(1000),
  dueAt: z.string(),
  remind: z.string(),
});
type Values = z.infer<typeof schema>;

function groupTodos(todos: Todo[]) {
  const now = new Date();
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const groups = { overdue: [] as Todo[], today: [] as Todo[], upcoming: [] as Todo[], none: [] as Todo[] };
  for (const todo of todos) {
    if (!todo.dueAt) groups.none.push(todo);
    else if (new Date(todo.dueAt).getTime() < now.getTime()) groups.overdue.push(todo);
    else if (new Date(todo.dueAt).getTime() < startOfTomorrow) groups.today.push(todo);
    else groups.upcoming.push(todo);
  }
  return groups;
}

export default function TodosPage() {
  const [tab, setTab] = useState<'open' | 'done'>('open');
  const [editing, setEditing] = useState<Todo | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Todo | null>(null);
  const { data, isLoading, error, refetch } = useTodos(tab);

  const toggle = useApiMutation((t: Todo) => api(`/todos/${t.id}`, { method: 'PATCH', body: { isDone: !t.isDone } }));
  const remove = useApiMutation((id: string) => api(`/todos/${id}`, { method: 'DELETE' }), 'Đã xóa việc');

  const groups = groupTodos(tab === 'open' ? (data ?? []) : []);
  const sections: Array<{ key: string; title: string; items: Todo[]; tone?: string }> = [
    { key: 'overdue', title: 'Quá hạn', items: groups.overdue, tone: 'text-danger' },
    { key: 'today', title: 'Hôm nay', items: groups.today },
    { key: 'upcoming', title: 'Sắp tới', items: groups.upcoming },
    { key: 'none', title: 'Không có hạn', items: groups.none },
  ];

  const row = (todo: Todo) => (
    <TodoRow key={todo.id} todo={todo} busy={toggle.isPending} onToggle={() => toggle.mutate(todo)} onEdit={() => setEditing(todo)} onDelete={() => setToDelete(todo)} />
  );

  return (
    <>
      <PageHeader title="Việc cần làm" description="Ghi chú việc cần làm và nhận thông báo đúng giờ" actions={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Thêm</Button>} />
      <div className="space-y-4">
        <NotificationsCard hideWhenOn />
        <div className="inline-flex rounded-lg bg-muted p-1">
          {(['open', 'done'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn('rounded-md px-4 py-1.5 text-sm font-medium', tab === t ? 'bg-card shadow-sm' : 'text-muted-foreground')}>
              {t === 'open' ? 'Cần làm' : 'Đã xong'}
            </button>
          ))}
        </div>

        {isLoading ? <LoadingState rows={3} /> : null}
        {error ? <ErrorState error={error} onRetry={() => refetch()} /> : null}
        {data && data.length === 0 ? (
          <EmptyState
            title={tab === 'open' ? 'Không còn việc nào' : 'Chưa có việc nào hoàn thành'}
            description={tab === 'open' ? 'Thêm việc đầu tiên, đặt giờ để được nhắc.' : undefined}
            action={tab === 'open' ? <Button onClick={() => setEditing('new')}>Thêm việc</Button> : undefined}
          />
        ) : null}

        {tab === 'open'
          ? sections.filter((s) => s.items.length > 0).map((s) => (
              <section key={s.key}>
                <h2 className={cn('mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground', s.tone)}>{s.title} · {s.items.length}</h2>
                <Card className="divide-y divide-border overflow-hidden">{s.items.map(row)}</Card>
              </section>
            ))
          : data && data.length > 0 ? <Card className="divide-y divide-border overflow-hidden">{data.map(row)}</Card> : null}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>{editing ? <TodoForm key={editing === 'new' ? 'new' : editing.id} todo={editing === 'new' ? null : editing} onDone={() => setEditing(null)} /> : null}</DialogContent>
      </Dialog>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Xóa việc này?"
        description={`"${toDelete?.title}" sẽ bị xóa vĩnh viễn.`}
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSettled: () => setToDelete(null) })}
      />
    </>
  );
}

function TodoRow({ todo, busy, onToggle, onEdit, onDelete }: { todo: Todo; busy: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const overdue = !todo.isDone && todo.dueAt !== null && new Date(todo.dueAt).getTime() < Date.now();
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <button
        onClick={onToggle}
        disabled={busy}
        aria-label={todo.isDone ? 'Đánh dấu chưa xong' : 'Đánh dấu đã xong'}
        className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors', todo.isDone ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary')}
      >
        {todo.isDone ? <Check className="h-3.5 w-3.5" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', todo.isDone && 'text-muted-foreground line-through')}>{todo.title}</p>
        {todo.note ? <p className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground">{todo.note}</p> : null}
        {todo.dueAt ? (
          <p className={cn('mt-1 flex items-center gap-1 text-xs', overdue ? 'font-medium text-danger' : 'text-muted-foreground')}>
            <Clock className="h-3 w-3" /> {formatDateTime(todo.dueAt)}
            {todo.remindBeforeMinutes > 0 ? <span className="ml-1 flex items-center gap-0.5"><BellRing className="h-3 w-3" /> {REMIND_LABELS[String(todo.remindBeforeMinutes)]}</span> : null}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0">
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Sửa"><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Xóa"><Trash2 className="h-4 w-4 text-danger" /></Button>
      </div>
    </div>
  );
}

function TodoForm({ todo, onDone }: { todo: Todo | null; onDone: () => void }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: todo?.title ?? '', note: todo?.note ?? '', dueAt: todo?.dueAt ? toLocalInput(todo.dueAt) : '', remind: String(todo?.remindBeforeMinutes ?? 0) },
  });
  const hasDue = Boolean(watch('dueAt'));

  const save = useApiMutation((v: Values) => {
    const body = {
      title: v.title,
      note: v.note,
      // <input type="datetime-local"> is local time; convert to an absolute instant for the server.
      dueAt: v.dueAt ? new Date(v.dueAt).toISOString() : todo ? null : undefined,
      remindBeforeMinutes: Number(v.remind),
    };
    return todo ? api(`/todos/${todo.id}`, { method: 'PATCH', body }) : api('/todos', { method: 'POST', body });
  }, todo ? 'Đã cập nhật' : 'Đã thêm việc');

  return (
    <form onSubmit={handleSubmit((v) => save.mutateAsync(v).then(onDone, () => undefined))} className="space-y-4" noValidate>
      <DialogHeader title={todo ? 'Sửa việc' : 'Thêm việc cần làm'} />
      <Field label="Việc cần làm" error={errors.title?.message}><Input {...register('title')} placeholder="Đóng tiền điện" autoFocus /></Field>
      <Field label="Ghi chú (tùy chọn)" error={errors.note?.message}><Input {...register('note')} /></Field>
      <Field label="Thời gian (tùy chọn)"><Input type="datetime-local" {...register('dueAt')} /></Field>
      <Field label="Nhắc tôi" hint={hasDue ? undefined : 'Chọn thời gian để được nhắc.'}>
        <Select {...register('remind')} disabled={!hasDue}>{Object.entries(REMIND_LABELS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</Select>
      </Field>
      <Button type="submit" className="w-full" disabled={save.isPending}>{save.isPending ? 'Đang lưu…' : 'Lưu'}</Button>
    </form>
  );
}
