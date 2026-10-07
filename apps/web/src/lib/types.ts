export type AccountType = 'CASH' | 'BANK' | 'EWALLET' | 'CREDIT_CARD' | 'OTHER';
export type EntryType = 'INCOME' | 'EXPENSE';
export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface User { id: string; email: string; name: string; avatar: string | null }
export interface Account {
  id: string; name: string; type: AccountType; initialBalance: string; balance: string; currency: string; isActive: boolean;
}
export interface CategoryRef { id: string; name: string; icon: string | null; color: string | null }
export interface Category extends CategoryRef { type: EntryType; isDefault: boolean }

export interface Transaction {
  id: string; type: EntryType; amount: string; note: string | null; transactionDate: string;
  accountId: string; categoryId: string; account: { id: string; name: string }; category: CategoryRef;
}
export interface PageMeta { page: number; pageSize: number; total: number; totalPages: number }
export interface TransactionList { items: Transaction[]; meta: PageMeta; totals: { income: string; expense: string } }
export interface Transfer {
  id: string; amount: string; note: string | null; transactionDate: string;
  fromAccount: { id: string; name: string }; toAccount: { id: string; name: string };
}
export interface TransferList { items: Transfer[]; meta: PageMeta }

export interface Budget {
  id: string; categoryId: string; amount: string; month: number; year: number; category: CategoryRef;
  spent: string; remaining: string; percentUsed: number; status: 'OK' | 'WARNING' | 'EXCEEDED';
}
export interface BudgetList { month: number; year: number; items: Budget[] }

export interface DebtPayment {
  id: string; amount: string; paidAt: string; note: string | null; account: { id: string; name: string } | null;
}
export interface Debt {
  id: string; personName: string; type: 'LEND' | 'BORROW'; totalAmount: string; paidAmount: string; remainingAmount: string;
  dueDate: string | null; note: string | null; status: 'OPEN' | 'SETTLED'; isOverdue: boolean; payments?: DebtPayment[];
}

export interface Recurring {
  id: string; type: EntryType; amount: string; frequency: Frequency; nextRunAt: string; endDate: string | null;
  note: string | null; isActive: boolean; account: { id: string; name: string }; category: CategoryRef;
}

export interface Summary { income: string; expense: string; savings: string; savingsRate: number }
export interface MonthPoint { month: string; income: string; expense: string; savings: string }
export interface CategorySlice { category: CategoryRef | null; amount: string; percent: number }
export interface CategoryBreakdown { total: string; items: CategorySlice[] }
export interface CashPoint { period: string; income: string; expense: string; net: string; cumulative: string }
export interface CashFlow { granularity: 'day' | 'month'; points: CashPoint[] }

export interface Dashboard {
  month: string; totalBalance: string; netWorth: string; thisMonth: Summary; lastMonth: Summary;
  incomeVsExpense: MonthPoint[]; expenseByCategory: CategoryBreakdown; cashFlow: CashFlow;
  monthlyComparison: Array<{ label: 'last' | 'this'; income: string; expense: string }>;
  recentTransactions: Transaction[];
}
export interface NetWorth {
  assets: { accounts: string; receivables: string; total: string };
  liabilities: { accounts: string; payables: string; total: string };
  netWorth: string;
  accounts: Array<{ id: string; name: string; type: AccountType; balance: string }>;
}
