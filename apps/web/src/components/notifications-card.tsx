'use client';

import { Bell, BellOff } from 'lucide-react';
import { usePush } from '@/lib/push';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

/** Enable/disable push notifications on this device. `hideWhenOn` makes it a banner that disappears once active. */
export function NotificationsCard({ hideWhenOn = false }: { hideWhenOn?: boolean }) {
  const { state, enable, disable, test } = usePush();

  if (state === 'loading') return null;
  if (hideWhenOn && (state === 'on' || state === 'unsupported')) return null;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {state === 'on' ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1 basis-56">
          <p className="font-medium">Thông báo nhắc việc</p>
          <p className="text-sm text-muted-foreground">
            {state === 'on' && 'Đang bật trên thiết bị này. Bạn sẽ nhận thông báo đúng giờ, kể cả khi đã đóng app.'}
            {state === 'off' && 'Bật để nhận thông báo khi đến giờ làm việc đã ghi chú, kể cả khi đóng app.'}
            {state === 'denied' && 'Thông báo đang bị chặn. Hãy cho phép thông báo cho trang này trong cài đặt trình duyệt/điện thoại, rồi tải lại trang.'}
            {state === 'ios-install' && 'Trên iPhone, hãy thêm app vào Màn hình chính (nút Chia sẻ → Thêm vào Màn hình chính), mở app từ biểu tượng đó rồi bật thông báo tại đây.'}
            {state === 'unsupported' && 'Trình duyệt này không hỗ trợ thông báo đẩy. Bạn vẫn thấy nhắc nhở khi đang mở app.'}
          </p>
        </div>
        {state === 'off' ? (
          <Button onClick={() => enable.mutate()} disabled={enable.isPending}>
            {enable.isPending ? 'Đang bật…' : 'Bật thông báo'}
          </Button>
        ) : null}
        {state === 'on' ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => test.mutate()} disabled={test.isPending}>Gửi thử</Button>
            <Button variant="ghost" size="sm" onClick={() => disable.mutate()} disabled={disable.isPending}>Tắt</Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
