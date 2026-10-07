'use client';

import { LogOut } from 'lucide-react';
import { CategoriesSection } from '@/components/categories-section';
import { PageHeader } from '@/components/page-header';
import { RecurringSection } from '@/components/recurring-section';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLogout } from '@/lib/auth';
import { useMe } from '@/lib/queries';

export default function SettingsPage() {
  const me = useMe(true);
  const logout = useLogout();
  return (
    <>
      <PageHeader title="Cài đặt" />
      <div className="space-y-5">
        <Card>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{me.data?.name ?? '…'}</p>
              <p className="truncate text-sm text-muted-foreground">{me.data?.email}</p>
            </div>
            <Button variant="outline" onClick={logout}><LogOut className="h-4 w-4" /> Đăng xuất</Button>
          </CardContent>
        </Card>
        <CategoriesSection />
        <RecurringSection />
      </div>
    </>
  );
}
