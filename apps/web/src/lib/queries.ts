'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMessage } from './api';
import type {
  Account, BudgetList, CashFlow, Category, CategoryBreakdown, Dashboard, Debt, EntryType, MonthPoint, NetWorth,
  Recurring, Summary, Todo, TransactionList, TransferList, User,
} from './types';

export type ReportRange = 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'this_year' | 'custom';
export interface ReportParams { range: ReportRange; from?: string; to?: string }

export const useMe = (enabled: boolean) => useQuery({ queryKey: ['me'], queryFn: () => api<User>('/auth/me'), enabled });
export const useDashboard = () => useQuery({ queryKey: ['dashboard'], queryFn: () => api<Dashboard>('/dashboard') });
export const useAccounts = () => useQuery({ queryKey: ['accounts'], queryFn: () => api<Account[]>('/accounts') });
export const useCategories = (type?: EntryType) =>
  useQuery({ queryKey: ['categories', type ?? 'all'], queryFn: () => api<Category[]>('/categories', { query: { type } }) });

export interface TransactionFilters {
  page: number; search?: string; type?: string; accountId?: string; categoryId?: string; from?: string; to?: string;
  sortBy: string; sortOrder: string;
}
export const useTransactions = (f: TransactionFilters) =>
  useQuery({
    queryKey: ['transactions', f],
    queryFn: () => api<TransactionList>('/transactions', { query: { ...f, pageSize: 15 } }),
    placeholderData: (previous) => previous, // keep the old page visible while the next one loads
  });
export const useTransfers = (page: number, enabled: boolean) =>
  useQuery({ queryKey: ['transfers', page], queryFn: () => api<TransferList>('/transfers', { query: { page, pageSize: 15 } }), enabled });

export const useBudgets = (month: number, year: number) =>
  useQuery({ queryKey: ['budgets', month, year], queryFn: () => api<BudgetList>('/budgets', { query: { month, year } }) });
export const useDebts = () => useQuery({ queryKey: ['debts'], queryFn: () => api<Debt[]>('/debts') });
export const useDebtDetail = (id: string, enabled: boolean) =>
  useQuery({ queryKey: ['debt', id], queryFn: () => api<Debt>(`/debts/${id}`), enabled });
/** Polls every 30s (and on tab focus) so reminders and the "overdue" badge stay fresh while the app is open. */
export const useTodos = (status: 'open' | 'done') =>
  useQuery({ queryKey: ['todos', status], queryFn: () => api<Todo[]>('/todos', { query: { status } }), refetchInterval: 30_000, refetchOnWindowFocus: true });
export const useRecurring = () => useQuery({ queryKey: ['recurring'], queryFn: () => api<Recurring[]>('/recurring') });

export const useMonthlyReport = (p: ReportParams) =>
  useQuery({
    queryKey: ['report-monthly', p],
    queryFn: () => api<{ summary: Summary; series: MonthPoint[] }>('/reports/monthly', { query: { ...p } }),
    enabled: p.range !== 'custom' || Boolean(p.from && p.to),
  });
export const useCategoryReport = (p: ReportParams, type: EntryType) =>
  useQuery({
    queryKey: ['report-categories', p, type],
    queryFn: () => api<CategoryBreakdown>('/reports/categories', { query: { ...p, type } }),
    enabled: p.range !== 'custom' || Boolean(p.from && p.to),
  });
export const useCashFlow = (p: ReportParams) =>
  useQuery({
    queryKey: ['report-cashflow', p],
    queryFn: () => api<CashFlow>('/reports/cash-flow', { query: { ...p } }),
    enabled: p.range !== 'custom' || Boolean(p.from && p.to),
  });
export const useNetWorth = () => useQuery({ queryKey: ['net-worth'], queryFn: () => api<NetWorth>('/reports/net-worth') });

/**
 * Every write can change balances, budgets, dashboards and reports at once, so after a successful
 * mutation we simply refetch all active queries. Simple and always consistent.
 */
export function useApiMutation<TVars, TData = unknown>(fn: (vars: TVars) => Promise<TData>, successMessage?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      if (successMessage) toast.success(successMessage);
      return queryClient.invalidateQueries();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
