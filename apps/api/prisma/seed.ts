/* Demo data: `npm run prisma:seed -w apps/api`. Idempotent: re-running recreates the demo user. */
import { AccountType, Prisma, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { DEFAULT_CATEGORIES } from '../src/modules/auth/default-categories';

const prisma = new PrismaClient();
const D = (v: number | string) => new Prisma.Decimal(v);

const DEMO_EMAIL = 'demo@moneybook.app';
const DEMO_PASSWORD = 'Demo123!';

// Small deterministic PRNG so the demo looks the same every time.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(2026);
const between = (min: number, max: number) => Math.round((min + rand() * (max - min)) / 1000) * 1000;

const ymd = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

async function main() {
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } }); // cascades to all demo data

  const now = new Date();
  const today = ymd(now.getFullYear(), now.getMonth(), now.getDate());
  const nextMonth = (day: number) => ymd(today.getUTCFullYear(), today.getUTCMonth() + 1, day);

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: 'Demo User',
      passwordHash: await argon2.hash(DEMO_PASSWORD),
      categories: { create: DEFAULT_CATEGORIES },
    },
  });
  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  const cat = (name: string, type: 'INCOME' | 'EXPENSE') => {
    const found = categories.find((c) => c.name === name && c.type === type);
    if (!found) throw new Error(`Missing category ${name}`);
    return found.id;
  };

  // ---- accounts (balance starts at initialBalance, transactions below adjust it) ----
  const accountSpecs: Array<[string, AccountType, number]> = [
    ['Tiền mặt', 'CASH', 2_000_000],
    ['Vietcombank', 'BANK', 20_000_000],
    ['MoMo', 'EWALLET', 1_500_000],
    ['Techcombank Visa', 'CREDIT_CARD', 0],
  ];
  const accounts: Record<string, string> = {};
  const balances = new Map<string, Prisma.Decimal>();
  for (const [name, type, initial] of accountSpecs) {
    const a = await prisma.account.create({
      data: { userId: user.id, name, type, initialBalance: D(initial), balance: D(initial) },
    });
    accounts[name] = a.id;
    balances.set(a.id, D(initial));
  }
  const move = (accountId: string, delta: Prisma.Decimal) =>
    balances.set(accountId, (balances.get(accountId) ?? D(0)).plus(delta));

  // ---- recurring rules (next run = next month; this/last months are already generated below) ----
  const salaryRule = await prisma.recurringTransaction.create({
    data: {
      userId: user.id, accountId: accounts['Vietcombank'], categoryId: cat('Lương', 'INCOME'), type: 'INCOME',
      amount: D(15_000_000), frequency: 'MONTHLY', dayOfMonth: 5, nextRunAt: nextMonth(5), note: 'Lương tháng',
    },
  });
  const rentRule = await prisma.recurringTransaction.create({
    data: {
      userId: user.id, accountId: accounts['Vietcombank'], categoryId: cat('Nhà cửa', 'EXPENSE'), type: 'EXPENSE',
      amount: D(3_000_000), frequency: 'MONTHLY', dayOfMonth: 1, nextRunAt: nextMonth(1), note: 'Tiền nhà',
    },
  });

  // ---- transactions: last 3 months ----
  type Row = Prisma.TransactionCreateManyInput;
  const rows: Row[] = [];
  const add = (type: 'INCOME' | 'EXPENSE', category: string, account: string, amount: number, date: Date, note: string, recurringId?: string) => {
    if (date > today) return;
    rows.push({
      userId: user.id, type, amount: D(amount), note, transactionDate: date, recurringId: recurringId ?? null,
      categoryId: cat(category, type), accountId: accounts[account],
    });
    move(accounts[account], type === 'INCOME' ? D(amount) : D(-amount));
  };

  const expenseTemplates: Array<[string, string, string, number, number]> = [
    ['Ăn uống', 'Ăn trưa', 'Tiền mặt', 35_000, 90_000],
    ['Ăn uống', 'Cà phê', 'MoMo', 25_000, 65_000],
    ['Ăn uống', 'Ăn tối cùng bạn bè', 'Vietcombank', 150_000, 400_000],
    ['Di chuyển', 'Grab', 'MoMo', 30_000, 120_000],
    ['Di chuyển', 'Đổ xăng', 'Tiền mặt', 60_000, 150_000],
    ['Mua sắm', 'Mua sắm online', 'Techcombank Visa', 150_000, 800_000],
    ['Giải trí', 'Xem phim', 'MoMo', 90_000, 250_000],
    ['Hóa đơn', 'Tiền điện', 'Vietcombank', 300_000, 600_000],
    ['Sức khỏe', 'Thuốc / khám bệnh', 'Tiền mặt', 100_000, 400_000],
    ['Học tập', 'Khóa học online', 'Vietcombank', 200_000, 500_000],
  ];

  for (let offset = 2; offset >= 0; offset--) {
    const y = today.getUTCFullYear();
    const m = today.getUTCMonth() - offset;
    add('INCOME', 'Lương', 'Vietcombank', 15_000_000, ymd(y, m, 5), 'Lương tháng', salaryRule.id);
    add('EXPENSE', 'Nhà cửa', 'Vietcombank', 3_000_000, ymd(y, m, 1), 'Tiền nhà', rentRule.id);
    if (offset === 1) add('INCOME', 'Freelance', 'Vietcombank', 2_500_000, ymd(y, m, 18), 'Dự án freelance');
    if (offset === 0) add('INCOME', 'Thưởng', 'Vietcombank', 1_000_000, ymd(y, m, 2), 'Thưởng KPI');
    for (let i = 0; i < 12; i++) {
      const [category, note, account, min, max] = expenseTemplates[Math.floor(rand() * expenseTemplates.length)];
      add('EXPENSE', category, account, between(min, max), ymd(y, m, 2 + Math.floor(rand() * 26)), note);
    }
  }
  await prisma.transaction.createMany({ data: rows });

  // ---- transfers ----
  const transfers = [
    { from: 'Vietcombank', to: 'Tiền mặt', amount: 2_000_000, date: ymd(today.getUTCFullYear(), today.getUTCMonth(), 3), note: 'Rút tiền mặt' },
    { from: 'Vietcombank', to: 'MoMo', amount: 1_000_000, date: ymd(today.getUTCFullYear(), today.getUTCMonth() - 1, 12), note: 'Nạp MoMo' },
  ];
  for (const t of transfers) {
    if (t.date > today) continue;
    await prisma.transfer.create({
      data: { userId: user.id, fromAccountId: accounts[t.from], toAccountId: accounts[t.to], amount: D(t.amount), transactionDate: t.date, note: t.note },
    });
    move(accounts[t.from], D(-t.amount));
    move(accounts[t.to], D(t.amount));
  }

  // ---- budgets (current month) ----
  const month = today.getUTCMonth() + 1;
  const year = today.getUTCFullYear();
  for (const [name, amount] of [['Ăn uống', 3_000_000], ['Di chuyển', 1_000_000], ['Giải trí', 800_000]] as const) {
    await prisma.budget.create({ data: { userId: user.id, categoryId: cat(name, 'EXPENSE'), amount: D(amount), month, year } });
  }

  // ---- debts ----
  const lend = await prisma.debt.create({
    data: { userId: user.id, personName: 'Nguyễn Văn A', type: 'LEND', totalAmount: D(1_000_000), paidAmount: D(500_000), note: 'Cho mượn tiền ăn', dueDate: nextMonth(15) },
  });
  await prisma.debtPayment.create({
    data: { debtId: lend.id, userId: user.id, accountId: accounts['Tiền mặt'], amount: D(500_000), paidAt: today, note: 'Trả đợt 1' },
  });
  move(accounts['Tiền mặt'], D(500_000)); // LEND payment = money back in
  await prisma.debt.create({
    data: { userId: user.id, personName: 'Trần Thị B', type: 'BORROW', totalAmount: D(2_000_000), note: 'Mượn đóng học phí', dueDate: ymd(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 30) },
  });

  // ---- write final balances ----
  for (const [id, balance] of balances) await prisma.account.update({ where: { id }, data: { balance } });

  console.log(`Seeded demo user ${DEMO_EMAIL} / ${DEMO_PASSWORD} with ${rows.length} transactions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
