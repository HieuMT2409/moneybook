'use client';

import { ChevronLeft, ChevronRight, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { useTransactionDialog } from '@/components/transaction-dialog';
import { TransactionRow } from '@/components/transaction-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { useAccounts, useApiMutation, useCategories, useTransactions, useTransfers } from '@/lib/queries';
import type { Transaction } from '@/lib/types';
import { useDebounce } from '@/lib/use-debounce';
import { cn } from '@/lib/utils';

const SORTS: Record<string, { sortBy: string; sortOrder: string; label: string }> = {
  dateDesc: { sortBy: 'transactionDate', sortOrder: 'desc', label: 'Mới nhất' },
  dateAsc: { sortBy: 'transactionDate', sortOrder: 'asc', label: 'Cũ nhất' },
  amountDesc: { sortBy: 'amount', sortOrder: 'desc', label: 'Số tiền giảm dần' },
  amountAsc: { sortBy: 'amount', sortOrder: 'asc', label: 'Số tiền tăng dần' },
};

export default function TransactionsPage() {
  const [tab, setTab] = useState<'entries' | 'transfers'>('entries');
  return (
    <>
      <PageHeader title="Giao dịch" description="Lịch sử thu, chi và chuyển tiền" />
      <div className="mb-4 inline-flex rounded-lg bg-muted p-1">
        {(['entries', 'transfers'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn('rounded-md px-4 py-1.5 text-sm font-medium', tab === t ? 'bg-card shadow-sm' : 'text-muted-foreground')}
          >
            {t === 'entries' ? 'Thu / Chi' : 'Chuyển tiền'}
          </button>
        ))}
      </div>
      {tab === 'entries' ? <EntriesTab /> : <TransfersTab />}
    </>
  );
}

function EntriesTab() {
  const { openEdit, openNew } = useTransactionDialog();
  const accounts = useAccounts();
  const categories = useCategories();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ type: '', accountId: '', categoryId: '', from: '', to: '', sort: 'dateDesc' });
  const [toDelete, setToDelete] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearch = useDebounce(search);

  const query = useTransactions({
    page, search: debouncedSearch || undefined, type: filters.type || undefined, accountId: filters.accountId || undefined,
    categoryId: filters.categoryId || undefined, from: filters.from || undefined, to: filters.to || undefined,
    sortBy: SORTS[filters.sort].sortBy, sortOrder: SORTS[filters.sort].sortOrder,
  });
  const remove = useApiMutation((id: string) => api(`/transactions/${id}`, { method: 'DELETE' }), 'Đã xóa giao dịch');

  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const activeFilterCount = [filters.type, filters.accountId, filters.categoryId, filters.from, filters.to].filter(Boolean).length;
  const hasFilters = Boolean(search || filters.type || filters.accountId || filters.categoryId || filters.from || filters.to);
  const reset = () => {
    setSearch('');
    setFilters((f) => ({ ...f, type: '', accountId: '', categoryId: '', from: '', to: '' }));
    setPage(1);
  };

  const data = query.data;
  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-3 md:p-4">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm ghi chú, danh mục…" className="pl-9" aria-label="Tìm kiếm" />
          </div>
          <Button variant="outline" className="shrink-0 md:hidden" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
            <SlidersHorizontal className="h-4 w-4" /> Lọc
            {activeFilterCount > 0 ? <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{activeFilterCount}</span> : null}
          </Button>
        </div>
        {/* Phones: filters are tucked behind the "Lọc" button; desktop always shows them. */}
        <div className={cn('grid grid-cols-2 gap-2 md:grid-cols-4', !showFilters && 'hidden md:grid')}>
          <Select value={filters.type} onChange={(e) => setFilter('type', e.target.value)} aria-label="Loại">
            <option value="">Tất cả loại</option>
            <option value="INCOME">Thu nhập</option>
            <option value="EXPENSE">Chi tiêu</option>
          </Select>
          <Select value={filters.accountId} onChange={(e) => setFilter('accountId', e.target.value)} aria-label="Tài khoản">
            <option value="">Mọi tài khoản</option>
            {(accounts.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Select value={filters.categoryId} onChange={(e) => setFilter('categoryId', e.target.value)} aria-label="Danh mục">
            <option value="">Mọi danh mục</option>
            {(categories.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </Select>
          <Select value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)} aria-label="Sắp xếp">
            {Object.entries(SORTS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
          </Select>
          <label className="min-w-0 space-y-1">
            <span className="text-xs text-muted-foreground">Từ ngày</span>
            <Input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-xs text-muted-foreground">Đến ngày</span>
            <Input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} />
          </label>
          {hasFilters ? (
            <Button variant="outline" onClick={reset} className="col-span-2 md:col-span-1 md:self-end">
              <X className="h-4 w-4" /> Xóa bộ lọc
            </Button>
          ) : null}
        </div>
      </Card>

      {data ? (
        <div className="flex flex-wrap gap-x-6 gap-y-1 px-1 text-sm">
          <span className="text-muted-foreground">{data.meta.total} giao dịch</span>
          <span className="text-success">Thu: {formatMoney(data.totals.income)}</span>
          <span className="text-danger">Chi: {formatMoney(data.totals.expense)}</span>
        </div>
      ) : null}

      {query.isLoading ? <LoadingState rows={5} /> : null}
      {query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      {data && data.items.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'Không có giao dịch phù hợp' : 'Chưa có giao dịch nào'}
          description={hasFilters ? 'Thử đổi hoặc xóa bộ lọc.' : 'Thêm giao dịch đầu tiên của bạn.'}
          action={!hasFilters ? <Button onClick={() => openNew()}><Plus className="h-4 w-4" /> Thêm giao dịch</Button> : undefined}
        />
      ) : null}
      {data && data.items.length > 0 ? (
        <Card className={cn('divide-y divide-border overflow-hidden', query.isPlaceholderData && 'opacity-60')}>
          {data.items.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} onEdit={() => openEdit(tx)} onDelete={() => setToDelete(tx)} />
          ))}
        </Card>
      ) : null}

      {data && data.meta.totalPages > 1 ? <Pager page={page} totalPages={data.meta.totalPages} onChange={setPage} /> : null}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Xóa giao dịch?"
        description={toDelete ? `Giao dịch ${formatMoney(toDelete.amount)} sẽ bị xóa và số dư tài khoản "${toDelete.account.name}" được hoàn lại.` : ''}
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </div>
  );
}

function TransfersTab() {
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const query = useTransfers(page, true);
  const remove = useApiMutation((id: string) => api(`/transfers/${id}`, { method: 'DELETE' }), 'Đã xóa lệnh chuyển tiền');
  const { openNew } = useTransactionDialog();
  const data = query.data;

  return (
    <div className="space-y-4">
      {query.isLoading ? <LoadingState rows={3} /> : null}
      {query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      {data && data.items.length === 0 ? (
        <EmptyState title="Chưa có lệnh chuyển tiền" description="Chuyển tiền giữa các tài khoản không tính vào thu/chi." action={<Button onClick={() => openNew('TRANSFER')}>Chuyển tiền</Button>} />
      ) : null}
      {data && data.items.length > 0 ? (
        <Card className="divide-y divide-border overflow-hidden">
          {data.items.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.fromAccount.name} → {t.toAccount.name}</p>
                <p className="truncate text-xs text-muted-foreground">{formatDate(t.transactionDate)}{t.note ? ` · ${t.note}` : ''}</p>
              </div>
              <p className="text-sm font-semibold tabular-nums">{formatMoney(t.amount)}</p>
              <Button variant="ghost" size="sm" onClick={() => setToDelete(t.id)}>Xóa</Button>
            </div>
          ))}
        </Card>
      ) : null}
      {data && data.meta.totalPages > 1 ? <Pager page={page} totalPages={data.meta.totalPages} onChange={setPage} /> : null}
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Xóa lệnh chuyển tiền?"
        description="Số dư của cả hai tài khoản sẽ được hoàn lại."
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete, { onSuccess: () => setToDelete(null) })}
      />
    </div>
  );
}

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Trang trước"><ChevronLeft className="h-4 w-4" /></Button>
      <span className="text-sm text-muted-foreground">Trang {page} / {totalPages}</span>
      <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Trang sau"><ChevronRight className="h-4 w-4" /></Button>
    </div>
  );
}
