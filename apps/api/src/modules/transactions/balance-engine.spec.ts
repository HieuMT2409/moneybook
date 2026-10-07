import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FakePrisma } from '../../testing/fake-prisma';
import { TransfersService } from '../transfers/transfers.service';
import { TransactionsService } from './transactions.service';

const USER_A = 'user-a';
const USER_B = 'user-b';

function setup() {
  const db = new FakePrisma();
  const prisma = db as unknown as PrismaService;
  const bank = db.addAccount(USER_A, 'Bank', '5000000');
  const cash = db.addAccount(USER_A, 'Cash', '500000');
  const salary = db.addCategory(USER_A, 'Lương', 'INCOME');
  const food = db.addCategory(USER_A, 'Ăn uống', 'EXPENSE');
  return {
    db, bank, cash, salary, food,
    transactions: new TransactionsService(prisma),
    transfers: new TransfersService(prisma),
  };
}

const tx = (accountId: string, categoryId: string, type: 'INCOME' | 'EXPENSE', amount: string) => ({
  type, amount, accountId, categoryId, transactionDate: '2026-10-01',
});

describe('Balance engine', () => {
  describe('income & expense', () => {
    it('income: 5.000.000 + 2.000.000 = 7.000.000', async () => {
      const { db, bank, salary, transactions } = setup();
      await transactions.create(USER_A, tx(bank.id, salary.id, 'INCOME', '2000000'));
      expect(db.balanceOf(bank.id)).toBe('7000000.00');
    });

    it('expense: 5.000.000 - 500.000 = 4.500.000', async () => {
      const { db, bank, food, transactions } = setup();
      await transactions.create(USER_A, tx(bank.id, food.id, 'EXPENSE', '500000'));
      expect(db.balanceOf(bank.id)).toBe('4500000.00');
    });

    it('never uses floating point (0.10 + 0.20 is exactly 0.30)', async () => {
      const { db, bank, salary, transactions } = setup();
      const wallet = db.addAccount(USER_A, 'Wallet', '0');
      await transactions.create(USER_A, tx(wallet.id, salary.id, 'INCOME', '0.10'));
      await transactions.create(USER_A, tx(wallet.id, salary.id, 'INCOME', '0.20'));
      expect(db.balanceOf(wallet.id)).toBe('0.30');
      expect(bank.balance.toFixed(2)).toBe('5000000.00');
    });

    it('rejects an expense that uses an income category, and changes nothing', async () => {
      const { db, bank, salary, transactions } = setup();
      await expect(transactions.create(USER_A, tx(bank.id, salary.id, 'EXPENSE', '1000'))).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(db.balanceOf(bank.id)).toBe('5000000.00');
      expect(db.transactions.size).toBe(0);
    });

    it('rejects a disabled account', async () => {
      const { db, food, transactions } = setup();
      const disabled = db.addAccount(USER_A, 'Old', '100', false);
      await expect(transactions.create(USER_A, tx(disabled.id, food.id, 'EXPENSE', '10'))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('editing a transaction moves the balance effect between accounts', async () => {
      const { db, bank, cash, food, transactions } = setup();
      const created = await transactions.create(USER_A, tx(bank.id, food.id, 'EXPENSE', '500000'));
      await transactions.update(USER_A, created.id, { accountId: cash.id, amount: '200000' });
      expect(db.balanceOf(bank.id)).toBe('5000000.00'); // old effect undone
      expect(db.balanceOf(cash.id)).toBe('300000.00'); // 500.000 - 200.000
    });

    it('deleting a transaction restores the balance', async () => {
      const { db, bank, food, transactions } = setup();
      const created = await transactions.create(USER_A, tx(bank.id, food.id, 'EXPENSE', '500000'));
      await transactions.remove(USER_A, created.id);
      expect(db.balanceOf(bank.id)).toBe('5000000.00');
      expect(db.transactions.size).toBe(0);
    });
  });

  describe('transfer', () => {
    it('Transfer 1.000.000: source 5.000.000 -> 4.000.000, destination 500.000 -> 1.500.000', async () => {
      const { db, bank, cash, transfers } = setup();
      await transfers.create(USER_A, {
        fromAccountId: bank.id, toAccountId: cash.id, amount: '1000000', transactionDate: '2026-10-01',
      });
      expect(db.balanceOf(bank.id)).toBe('4000000.00');
      expect(db.balanceOf(cash.id)).toBe('1500000.00');
    });

    it('rejects the same source and destination account', async () => {
      const { bank, transfers } = setup();
      await expect(
        transfers.create(USER_A, { fromAccountId: bank.id, toAccountId: bank.id, amount: '1', transactionDate: '2026-10-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deleting a transfer reverses both accounts', async () => {
      const { db, bank, cash, transfers } = setup();
      const t = await transfers.create(USER_A, {
        fromAccountId: bank.id, toAccountId: cash.id, amount: '1000000', transactionDate: '2026-10-01',
      });
      await transfers.remove(USER_A, t.id);
      expect(db.balanceOf(bank.id)).toBe('5000000.00');
      expect(db.balanceOf(cash.id)).toBe('500000.00');
    });
  });

  describe('rollback', () => {
    it('transfer: if the 2nd balance update fails, the source debit is rolled back and no Transfer row remains', async () => {
      const { db, bank, cash, transfers } = setup();
      db.failOnAccountUpdateCall = 2; // 1st update (debit source) succeeds, 2nd (credit destination) throws
      await expect(
        transfers.create(USER_A, {
          fromAccountId: bank.id, toAccountId: cash.id, amount: '1000000', transactionDate: '2026-10-01',
        }),
      ).rejects.toThrow('simulated database failure');

      expect(db.balanceOf(bank.id)).toBe('5000000.00');
      expect(db.balanceOf(cash.id)).toBe('500000.00');
      expect(db.transfers.size).toBe(0);
    });

    it('transaction: if the balance update fails, the transaction row is not kept', async () => {
      const { db, bank, food, transactions } = setup();
      db.failOnAccountUpdateCall = 1;
      await expect(transactions.create(USER_A, tx(bank.id, food.id, 'EXPENSE', '500000'))).rejects.toThrow();
      expect(db.transactions.size).toBe(0);
      expect(db.balanceOf(bank.id)).toBe('5000000.00');
    });
  });

  describe('user data isolation', () => {
    it("user B cannot read, edit or delete user A's transaction (404, not 403)", async () => {
      const { bank, food, transactions } = setup();
      const created = await transactions.create(USER_A, tx(bank.id, food.id, 'EXPENSE', '1000'));
      await expect(transactions.get(USER_B, created.id)).rejects.toBeInstanceOf(NotFoundException);
      await expect(transactions.update(USER_B, created.id, { amount: '1' })).rejects.toBeInstanceOf(NotFoundException);
      await expect(transactions.remove(USER_B, created.id)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("user B cannot post to user A's account or use A's category", async () => {
      const { db, bank, food, transactions } = setup();
      const bCategory = db.addCategory(USER_B, 'Ăn uống', 'EXPENSE');
      const bAccount = db.addAccount(USER_B, 'Bank', '0');
      await expect(transactions.create(USER_B, tx(bank.id, bCategory.id, 'EXPENSE', '1000'))).rejects.toBeInstanceOf(NotFoundException);
      await expect(transactions.create(USER_B, tx(bAccount.id, food.id, 'EXPENSE', '1000'))).rejects.toBeInstanceOf(NotFoundException);
      expect(db.balanceOf(bank.id)).toBe('5000000.00');
    });

    it("user B cannot transfer out of user A's account", async () => {
      const { db, bank, transfers } = setup();
      const bAccount = db.addAccount(USER_B, 'Mine', '0');
      await expect(
        transfers.create(USER_B, { fromAccountId: bank.id, toAccountId: bAccount.id, amount: '100', transactionDate: '2026-10-01' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.balanceOf(bank.id)).toBe('5000000.00');
    });
  });
});
