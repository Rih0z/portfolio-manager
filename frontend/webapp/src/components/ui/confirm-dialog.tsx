/**
 * ConfirmDialog — window.confirm() 置換用の確認ダイアログ
 *
 * shadcn/ui Dialog をベースに、破壊的操作の確認 UI を提供する。
 * window.confirm() を使わず in-app で完結させる。
 *
 * @file src/components/ui/confirm-dialog.tsx
 */
import React from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from './dialog';
import { Button } from './button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = '実行',
  cancelLabel = 'キャンセル',
  variant = 'default',
}) => {
  const confirmClassName =
    variant === 'danger'
      ? 'bg-danger-500 hover:bg-danger-600 text-white'
      : variant === 'warning'
        ? 'bg-warning-500 hover:bg-warning-600 text-white'
        : 'bg-primary-500 hover:bg-primary-600 text-white';

  return (
    <Dialog isOpen={isOpen} onClose={onCancel} size="sm">
      <DialogHeader onClose={onCancel}>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <p className="text-sm text-muted-foreground whitespace-pre-line">{description}</p>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <button
          onClick={onConfirm}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${confirmClassName}`}
        >
          {confirmLabel}
        </button>
      </DialogFooter>
    </Dialog>
  );
};

export { ConfirmDialog };
export default ConfirmDialog;
