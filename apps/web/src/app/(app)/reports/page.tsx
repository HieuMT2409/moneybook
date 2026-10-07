'use client';

import { useState } from 'react';
import { CashFlowChart, CategoryDonut, IncomeExpenseChart } from '@/components/charts';
import { PageHeader } from '@/components/page-header';
import { ErrorState, LoadingState } from '@/components/states';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { formatMoney } from '@/lib/format';
import { useCashFlow, useCategoryReport, useMonthlyReport, useNetWorth, type ReportParams, type ReportRange } from '@/lib/queries';
import type { EntryType } from '@/lib/types';
import { cn } from '@/lib/utils';

const RANGES: Array<{ value: ReportRange; label: string }> = [
  { value: 'this_month', label: 'Tháng này' },
  { value: 'last_month', label: 'Tháng trước' },
  { value: 'last_3_months', label: '3 tháng gần nhất' },
  { value: 'last_6_months', label: '6 tháng gần nhất' },
  { value: 'this_year', label: 'Năm nay' },
  { value: 'custom', label: 'Tùy chọn…' },
];

function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-lg font-bold tabular-nums', className)}>{value}</p>
    </CardContent></Card>
  );
}

export default function ReportsPage() {
  const [range, setRange] = useState<ReportRange>('this_month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [catType, setCatType] = useState<EntryType>('EXPENSE');
  const params: ReportParams = { range, from: range === 'custom' ? from : undefined, to: range === 'custom' ? to : undefined };

  const monthly = useMonthlyReport(params);
  const categories = useCategoryReport(params, catType);
  const cashFlow = useCashFlow(params);
  const netWorth = useNetWorth();

  return (
    <>
      <PageHeader
        title="Báo cáo"
        actions={<Select value={range} onChange={(e) => setRange(e.target.value as ReportRange)} aria-label="Khoảng thời gian" className="w-44">{RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</Select>}
      />
      {range === 'custom' ? (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Từ ngày" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Đến ngày" />
        </div>
      ) : null}
      {range === 'custom' && (!from || !to) ? <p className="mb-4 text-sm text-muted-foreground">Chọn cả hai ngày để xem báo cáo.</p> : null}

      <div className="space-y-5">
        {monthly.isLoading ? <LoadingState rows={2} /> : null}
        {monthly.error ? <ErrorState error={monthly.error} onRetry={() => monthly.refetch()} /> : null}
        {monthly.data ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric label="Thu nhập" value={formatMoney(monthly.data.summary.income)} className="text-success" />
              <Metric label="Chi tiêu" value={formatMoney(monthly.data.summary.expense)} className="text-danger" />
              <Metric label="Tiết kiệm" value={formatMoney(monthly.data.summary.savings)} />
              <Metric label="Savings Rate" value={`${monthly.data.summary.savingsRate}%`} />
            </div>
            <Card>
              <CardHeader><CardTitle>Thu và chi theo tháng</CardTitle></CardHeader>
              <CardContent><IncomeExpenseChart data={monthly.data.series} /></CardContent>
            </Card>
          </>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Theo danh mục</CardTitle>
              <div className="inline-flex rounded-lg bg-muted p-0.5 text-xs">
                {(['EXPENSE', 'INCOME'] as const).map((t) => (
                  <button key={t} onClick={() => setCatType(t)} className={cn('rounded-md px-3 py-1 font-medium', catType === t ? 'bg-card shadow-sm' : 'text-muted-foreground')}>
                    {t === 'EXPENSE' ? 'Chi' : 'Thu'}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {categories.isLoading ? <LoadingState rows={2} /> : null}
              {categories.error ? <ErrorState error={categories.error} /> : null}
              {categories.data && categories.data.items.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Không có dữ liệu trong khoảng thời gian này</p> : null}
              {categories.data && categories.data.items.length > 0 ? (
                <>
                  <CategoryDonut items={categories.data.items} />
                  <ul className="mt-3 space-y-2 text-sm">
                    {categories.data.items.map((s) => (
                      <li key={s.category?.id ?? 'x'} className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.category?.color ?? '#64748b' }} /><span className="truncate">{s.category?.icon} {s.category?.name}</span></span>
                        <span className="shrink-0 tabular-nums">{formatMoney(s.amount)} <span className="text-muted-foreground">({s.percent}%)</span></span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Dòng tiền (lũy kế)</CardTitle></CardHeader>
            <CardContent>
              {cashFlow.isLoading ? <LoadingState rows={2} /> : null}
              {cashFlow.error ? <ErrorState error={cashFlow.error} /> : null}
              {cashFlow.data ? <CashFlowChart data={cashFlow.data} /> : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Tài sản ròng hiện tại</CardTitle></CardHeader>
          <CardContent>
            {netWorth.isLoading ? <LoadingState rows={2} /> : null}
            {netWorth.error ? <ErrorState error={netWorth.error} /> : null}
            {netWorth.data ? (
              <div className="space-y-3 text-sm">
                <Row label="Tài sản" value={netWorth.data.assets.total} detail={`Tài khoản ${formatMoney(netWorth.data.assets.accounts)} + Phải thu ${formatMoney(netWorth.data.assets.receivables)}`} />
                <Row label="− Nợ phải trả" value={netWorth.data.liabilities.total} detail={`Dư nợ thẻ/tài khoản âm ${formatMoney(netWorth.data.liabilities.accounts)} + Đi vay ${formatMoney(netWorth.data.liabilities.payables)}`} />
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="font-semibold">= Tài sản ròng</span>
                  <span className={cn('text-xl font-bold tabular-nums', Number(netWorth.data.netWorth) < 0 ? 'text-danger' : 'text-primary')}>{formatMoney(netWorth.data.netWorth)}</span>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Row({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div>
      <div className="flex items-center justify-between"><span className="font-medium">{label}</span><span className="font-semibold tabular-nums">{formatMoney(value)}</span></div>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
