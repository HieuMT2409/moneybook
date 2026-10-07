'use client';

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { compactMoney, formatMoney, monthLabel } from '@/lib/format';
import type { CashFlow, CategorySlice, MonthPoint } from '@/lib/types';

const INCOME_COLOR = '#059669';
const EXPENSE_COLOR = '#dc2626';
const FALLBACK_COLORS = ['#0f766e', '#2563eb', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#64748b'];

const tooltipMoney = (value: unknown) => formatMoney(Number(value));
const axisProps = { tickLine: false, axisLine: false, fontSize: 12, stroke: '#94a3b8' } as const;

function ChartBox({ children, height = 240 }: { children: React.ReactElement; height?: number }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function IncomeExpenseChart({ data }: { data: MonthPoint[] }) {
  const rows = data.map((d) => ({ name: monthLabel(d.month), Thu: Number(d.income), Chi: Number(d.expense) }));
  return (
    <ChartBox>
      <BarChart data={rows} margin={{ left: -10, right: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" {...axisProps} />
        <YAxis tickFormatter={compactMoney} {...axisProps} />
        <Tooltip formatter={tooltipMoney} />
        <Legend />
        <Bar dataKey="Thu" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} />
        <Bar dataKey="Chi" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartBox>
  );
}

export function ComparisonChart({ data }: { data: Array<{ label: string; income: string; expense: string }> }) {
  const rows = data.map((d) => ({ name: d.label === 'this' ? 'Tháng này' : 'Tháng trước', Thu: Number(d.income), Chi: Number(d.expense) }));
  return (
    <ChartBox>
      <BarChart data={rows} margin={{ left: -10, right: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" {...axisProps} />
        <YAxis tickFormatter={compactMoney} {...axisProps} />
        <Tooltip formatter={tooltipMoney} />
        <Legend />
        <Bar dataKey="Thu" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} />
        <Bar dataKey="Chi" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartBox>
  );
}

export function CategoryDonut({ items }: { items: CategorySlice[] }) {
  const rows = items.map((s, i) => ({
    name: s.category?.name ?? 'Khác', value: Number(s.amount), color: s.category?.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }));
  return (
    <ChartBox height={220}>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={2}>
          {rows.map((r) => (
            <Cell key={r.name} fill={r.color} />
          ))}
        </Pie>
        <Tooltip formatter={tooltipMoney} />
      </PieChart>
    </ChartBox>
  );
}

export function CashFlowChart({ data }: { data: CashFlow }) {
  const rows = data.points.map((p) => ({
    name: data.granularity === 'day' ? p.period.slice(8) : monthLabel(p.period),
    'Dòng tiền ròng lũy kế': Number(p.cumulative),
  }));
  return (
    <ChartBox>
      <AreaChart data={rows} margin={{ left: -10, right: 4 }}>
        <defs>
          <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" {...axisProps} />
        <YAxis tickFormatter={compactMoney} {...axisProps} />
        <Tooltip formatter={tooltipMoney} />
        <Area type="monotone" dataKey="Dòng tiền ròng lũy kế" stroke="#0f766e" fill="url(#cf)" strokeWidth={2} />
      </AreaChart>
    </ChartBox>
  );
}
