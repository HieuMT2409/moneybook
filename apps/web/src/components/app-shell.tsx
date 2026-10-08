'use client';

import { ArrowLeftRight, BarChart3, HandCoins, LayoutDashboard, ListTodo, LogOut, MoreHorizontal, PiggyBank, Plus, Settings, Wallet } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthGate, useLogout } from '@/lib/auth';
import { useTodos } from '@/lib/queries';
import { useNow } from '@/lib/use-now';
import { useTodoReminderToasts } from '@/lib/use-todo-toasts';
import { cn } from '@/lib/utils';
import { TransactionDialogProvider, useTransactionDialog } from './transaction-dialog';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Giao dịch', icon: ArrowLeftRight },
  { href: '/accounts', label: 'Tài khoản', icon: Wallet },
  { href: '/budgets', label: 'Ngân sách', icon: PiggyBank },
  { href: '/debts', label: 'Sổ nợ', icon: HandCoins },
  { href: '/todos', label: 'Việc cần làm', icon: ListTodo },
  { href: '/reports', label: 'Báo cáo', icon: BarChart3 },
  { href: '/settings', label: 'Cài đặt', icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready } = useAuthGate();
  if (!ready) {
    return (
      <div className="p-6">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }
  return (
    <TransactionDialogProvider>
      <Shell>{children}</Shell>
    </TransactionDialogProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuthGate();
  const logout = useLogout();
  const { openNew } = useTransactionDialog();
  const todos = useTodos('open');
  // In-app toast when a reminder time passes while the app is open (phone notifications work independently).
  useTodoReminderToasts(todos.data, true);
  const now = useNow();
  const dueCount = (todos.data ?? []).filter((t) => t.dueAt !== null && new Date(t.dueAt).getTime() <= now).length;
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card p-4 md:flex">
        <div className="mb-6 px-2 text-lg font-bold tracking-tight text-primary">MONEYBOOK</div>
        <Button className="mb-4 w-full" onClick={() => openNew()}>
          <Plus className="h-4 w-4" /> Giao dịch
        </Button>
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive(href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {href === '/todos' && dueCount > 0 ? (
                <span className="ml-auto rounded-full bg-danger px-1.5 text-xs font-semibold text-white">{dueCount}</span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border pt-3">
          <p className="truncate px-2 text-sm font-medium">{user?.name ?? '…'}</p>
          <p className="truncate px-2 text-xs text-muted-foreground">{user?.email}</p>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={logout}>
            <LogOut className="h-4 w-4" /> Đăng xuất
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10 md:pt-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      {/* Mobile bottom navigation: Home | Transactions | + | Reports | More */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-end border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Điều hướng chính">
        <MobileLink href="/dashboard" label="Home" icon={LayoutDashboard} active={isActive('/dashboard')} />
        <MobileLink href="/transactions" label="Giao dịch" icon={ArrowLeftRight} active={isActive('/transactions')} />
        <div className="flex justify-center">
          <button
            onClick={() => openNew()}
            aria-label="Thêm giao dịch"
            className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background active:scale-95"
          >
            <Plus className="h-7 w-7" />
          </button>
        </div>
        <MobileLink href="/reports" label="Báo cáo" icon={BarChart3} active={isActive('/reports')} />
        <MobileLink href="/more" label="Thêm" icon={MoreHorizontal} badge={dueCount} active={['/more', '/accounts', '/budgets', '/debts', '/todos', '/settings'].some(isActive)} />
      </nav>
    </div>
  );
}

function MobileLink({ href, label, icon: Icon, active, badge = 0 }: { href: string; label: string; icon: typeof Plus; active: boolean; badge?: number }) {
  return (
    <Link href={href} className={cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', active ? 'text-primary' : 'text-muted-foreground')}>
      <span className="relative">
        <Icon className="h-5 w-5" />
        {badge > 0 ? <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-card" aria-label={`${badge} việc đến hạn`} /> : null}
      </span>
      {label}
    </Link>
  );
}
