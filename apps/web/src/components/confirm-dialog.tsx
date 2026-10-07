'use client';

import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader } from './ui/dialog';

/** Confirmation before any destructive action. */
export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel = 'Xóa', loading, onConfirm,
}: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string;
  confirmLabel?: string; loading?: boolean; onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader title={title} description={description} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button variant="destructive" disabled={loading} onClick={onConfirm}>
            {loading ? 'Đang xử lý…' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
