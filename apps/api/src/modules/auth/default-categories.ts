import { CategoryType } from '@prisma/client';

type Seed = { name: string; icon: string; color: string };

const INCOME: Seed[] = [
  { name: 'Lương', icon: '💼', color: '#059669' },
  { name: 'Freelance', icon: '💻', color: '#0d9488' },
  { name: 'Thưởng', icon: '🎁', color: '#d97706' },
  { name: 'Đầu tư', icon: '📈', color: '#2563eb' },
  { name: 'Khác', icon: '➕', color: '#64748b' },
];

const EXPENSE: Seed[] = [
  { name: 'Ăn uống', icon: '🍜', color: '#ea580c' },
  { name: 'Di chuyển', icon: '🛵', color: '#0284c7' },
  { name: 'Mua sắm', icon: '🛍️', color: '#db2777' },
  { name: 'Giải trí', icon: '🎮', color: '#7c3aed' },
  { name: 'Nhà cửa', icon: '🏠', color: '#b45309' },
  { name: 'Sức khỏe', icon: '💊', color: '#dc2626' },
  { name: 'Học tập', icon: '📚', color: '#4f46e5' },
  { name: 'Hóa đơn', icon: '🧾', color: '#0f766e' },
  { name: 'Du lịch', icon: '✈️', color: '#0891b2' },
  { name: 'Khác', icon: '➖', color: '#64748b' },
];

export const DEFAULT_CATEGORIES = [
  ...INCOME.map((c) => ({ ...c, type: CategoryType.INCOME, isDefault: true })),
  ...EXPENSE.map((c) => ({ ...c, type: CategoryType.EXPENSE, isDefault: true })),
];
