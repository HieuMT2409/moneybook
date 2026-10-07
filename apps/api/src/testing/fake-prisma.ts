import { Decimal } from '../common/money';

/**
 * A tiny in-memory stand-in for PrismaService used by the business-logic tests.
 * It implements just the calls the balance engine makes, and its $transaction really
 * snapshots + restores state on error, so "rollback" behaviour is observable in a unit test.
 */
export interface AccountRow {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  balance: Decimal;
  initialBalance: Decimal;
}
export interface CategoryRow {
  id: string;
  userId: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
}
export interface TransactionRow {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string;
  type: 'INCOME' | 'EXPENSE';
  amount: Decimal;
  note: string | null;
  transactionDate: Date;
}
export interface TransferRow {
  id: string;
  userId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: Decimal;
  note: string | null;
  transactionDate: Date;
}

type Where = { id: string; userId?: string };
const clone = <T extends { id: string }>(m: Map<string, T>) => new Map([...m].map(([k, v]) => [k, { ...v }]));

export class FakePrisma {
  accounts = new Map<string, AccountRow>();
  categories = new Map<string, CategoryRow>();
  transactions = new Map<string, TransactionRow>();
  transfers = new Map<string, TransferRow>();

  /** Make the Nth call to account.update throw, to simulate a DB failure mid-operation. */
  failOnAccountUpdateCall: number | null = null;
  private accountUpdateCalls = 0;
  private seq = 0;

  addAccount(userId: string, name: string, balance: string, isActive = true): AccountRow {
    const row: AccountRow = {
      id: `acc-${++this.seq}`, userId, name, isActive,
      balance: new Decimal(balance), initialBalance: new Decimal(balance),
    };
    this.accounts.set(row.id, row);
    return row;
  }

  addCategory(userId: string, name: string, type: 'INCOME' | 'EXPENSE'): CategoryRow {
    const row: CategoryRow = { id: `cat-${++this.seq}`, userId, name, type };
    this.categories.set(row.id, row);
    return row;
  }

  balanceOf(id: string): string {
    const account = this.accounts.get(id);
    if (!account) throw new Error(`no account ${id}`);
    return account.balance.toFixed(2);
  }

  private owned<T extends { userId: string }>(row: T | undefined, where: Where): T | null {
    return row && (where.userId === undefined || row.userId === where.userId) ? row : null;
  }

  account = {
    findFirst: async ({ where }: { where: Where }) => {
      const row = this.owned(this.accounts.get(where.id), where);
      return row ? { ...row } : null;
    },
    update: async ({ where, data }: { where: Where; data: { balance?: { increment: Decimal } } }) => {
      this.accountUpdateCalls += 1;
      if (this.failOnAccountUpdateCall === this.accountUpdateCalls) throw new Error('simulated database failure');
      const row = this.owned(this.accounts.get(where.id), where);
      if (!row) throw new Error('Record to update not found');
      if (data.balance) row.balance = row.balance.plus(data.balance.increment);
      return { ...row };
    },
  };

  category = {
    findFirst: async ({ where }: { where: Where }) => {
      const row = this.owned(this.categories.get(where.id), where);
      return row ? { ...row } : null;
    },
  };

  transaction = {
    create: async ({ data }: { data: Omit<TransactionRow, 'id'> }) => {
      const row: TransactionRow = { id: `tx-${++this.seq}`, ...data };
      this.transactions.set(row.id, row);
      return { ...row };
    },
    findFirst: async ({ where }: { where: Where }) => {
      const row = this.owned(this.transactions.get(where.id), where);
      return row ? { ...row } : null;
    },
    update: async ({ where, data }: { where: Where; data: Partial<TransactionRow> }) => {
      const row = this.owned(this.transactions.get(where.id), where);
      if (!row) throw new Error('Record to update not found');
      Object.assign(row, data);
      return { ...row };
    },
    delete: async ({ where }: { where: Where }) => {
      const row = this.owned(this.transactions.get(where.id), where);
      if (!row) throw new Error('Record to delete not found');
      this.transactions.delete(row.id);
      return row;
    },
  };

  transfer = {
    create: async ({ data }: { data: Omit<TransferRow, 'id'> }) => {
      const row: TransferRow = { id: `tr-${++this.seq}`, ...data };
      this.transfers.set(row.id, row);
      return { ...row };
    },
    findFirst: async ({ where }: { where: Where }) => {
      const row = this.owned(this.transfers.get(where.id), where);
      return row ? { ...row } : null;
    },
    delete: async ({ where }: { where: Where }) => {
      const row = this.owned(this.transfers.get(where.id), where);
      if (!row) throw new Error('Record to delete not found');
      this.transfers.delete(row.id);
      return row;
    },
  };

  /** All-or-nothing: on any error every table is restored to its state before the callback ran. */
  async $transaction<T>(fn: (tx: this) => Promise<T>): Promise<T> {
    const snapshot = {
      accounts: clone(this.accounts),
      transactions: clone(this.transactions),
      transfers: clone(this.transfers),
    };
    try {
      return await fn(this);
    } catch (error) {
      this.accounts = snapshot.accounts;
      this.transactions = snapshot.transactions;
      this.transfers = snapshot.transfers;
      throw error;
    }
  }
}
