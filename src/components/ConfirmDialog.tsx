import type { ReactNode } from 'react';
import { Modal } from './Modal';

type ConfirmDialogProps = {
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  children,
  confirmLabel = 'Potwierdź',
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="space-y-4">
        <div className="text-sm text-slate-600">{children}</div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
            Anuluj
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded px-3 py-1.5 text-sm text-white ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
