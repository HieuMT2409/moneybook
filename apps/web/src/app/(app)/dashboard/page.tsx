'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { CashFlowChart, CategoryDonut, ComparisonChart, IncomeExpenseChart } from '@/components/charts';
import { PageHeader } from '@/components/page-header';
import { ErrorState, LoadingState } from '@/components/states';
import { useTransactionDialog } from '@/components/transaction-dialog';
import { TransactionRow } from '@/components/transaction-row';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney, monthLabel } from '@/lib/format';
import { useDashboard } from '@/lib/queries';
import { cn } from '@/lib/utils';

function Stat({ label, value, tone, sub }: { label: string; value: string; tone?: 'success' | 'danger' | 'primary'; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={cn('mt-1 text-lg font-bold tabular-nums md:text-xl', tone === 'success' && 'text-success', tone === 'danger' && 'text-danger', tone === 'primary' && 'text-primary')}>
          {value}
        </p>
        {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard();
  const { openNew } = useTransactionDialog();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={data ? `Tổng quan ${monthLabel(data.month)}` : undefined}
        actions={
          <Button onClick={() => openNew()} className="hidden md:inline-flex">
            <Plus className="h-4 w-4" /> Giao dịch
          </Button>
        }
      />
      {isLoading ? <LoadingState rows={4} /> : null}
      {error ? <ErrorState error={error} onRetry={() => refetch()} /> : null}
      {data ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div className="col-span-2 lg:col-span-1">
              <Stat label="Tổng tài sản" value={formatMoney(data.totalBalance)} tone="primary" />
            </div>
            <Stat label="Thu nhập tháng này" value={formatMoney(data.thisMonth.income)} tone="success" />
            <Stat label="Chi tiêu tháng này" value={formatMoney(data.thisMonth.expense)} tone="danger" />
            <Stat label="Tiết kiệm" value={formatMoney(data.thisMonth.savings)} tone={Number(data.thisMonth.savings) >= 0 ? 'success' : 'danger'} />
            <Stat label="Savings Rate" value={`${data.thisMonth.savingsRate}%`} sub={`Tháng trước: ${data.lastMonth.savingsRate}%`} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Thu và chi 6 tháng gần nhất</CardTitle></CardHeader>
              <CardContent><IncomeExpenseChart data={data.incomeVsExpense} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Chi tiêu theo danh mục</CardTitle></CardHeader>
              <CardContent>
                {data.expenseByCategory.items.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">Chưa có chi tiêu trong tháng này</p>
                ) : (
                  <div className="grid items-center gap-2 sm:grid-cols-2">
                    <CategoryDonut items={data.expenseByCategory.items} />
                    <ul className="space-y-1.5 text-sm">
                      {data.expenseByCategory.items.slice(0, 6).map((s) => (
                        <li key={s.category?.id ?? 'other'} className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.category?.color ?? '#64748b' }} />
                            <span className="truncate">{s.category?.name}</span>
                          </span>
                          <span className="shrink-0 text-muted-foreground">{s.percent}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Dòng tiền tháng này (lũy kế)</CardTitle></CardHeader>
              <CardContent><CashFlowChart data={data.cashFlow} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>So sánh với tháng trước</CardTitle></CardHeader>
              <CardContent><ComparisonChart data={data.monthlyComparison} /></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Giao dịch gần đây</CardTitle>
              <Link href="/transactions" className="text-sm text-primary">Xem tất cả</Link>
            </CardHeader>
            <div className="divide-y divide-border pt-2">
              {data.recentTransactions.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">Chưa có giao dịch nào</p>
              ) : (
                data.recentTransactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
              )}
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
