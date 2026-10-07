import { AlertTriangle, Inbox } from 'lucide-react';
import * as React from 'react';
import { errorMessage } from '@/lib/api';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Đang tải">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-danger" />
      <div>
        <p className="font-medium">Không tải được dữ liệu</p>
        <p className="mt-1 text-sm text-muted-foreground">{errorMessage(error)}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Thử lại
        </Button>
      ) : null}
    </Card>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-3 p-8 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground" />
      <div>
        <p className="font-medium">{title}</p>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </Card>
  );
}
