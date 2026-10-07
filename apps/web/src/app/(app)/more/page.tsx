'use client';

import { ChevronRight, LogOut } from 'lucide-react';
import Link from 'next/link';
import { NAV_ITEMS } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { useLogout } from '@/lib/auth';

const MORE_ITEMS = NAV_ITEMS.filter((i) => ['/accounts', '/budgets', '/debts', '/settings'].includes(i.href));

export default function MorePage() {
  const logout = useLogout();
  return (
    <>
      <PageHeader title="Thêm" />
      <Card className="divide-y divide-border overflow-hidden">
        {MORE_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium hover:bg-muted">
            <Icon className="h-5 w-5 text-primary" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
        <button onClick={logout} className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-danger hover:bg-muted">
          <LogOut className="h-5 w-5" /> Đăng xuất
        </button>
      </Card>
    </>
  );
}
