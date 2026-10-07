'use client';

import { Button } from '@/components/ui/button';

/** Error boundary: an unexpected rendering error shows this instead of a blank page. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Đã có lỗi xảy ra</h1>
      <p className="text-sm text-muted-foreground">{error.message || 'Vui lòng thử lại.'}</p>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  );
}
