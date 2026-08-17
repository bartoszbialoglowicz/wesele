import { useState } from 'react';
import { Modal } from '../../components/Modal';
import type { Table } from '../../db/types';

export type TableFormValues = {
  name: string;
  capacity: number;
};

type TableModalProps = {
  title: string;
  initial?: Table;
  onSave: (values: TableFormValues) => void;
  onClose: () => void;
};

export function TableModal({ title, initial, onSave, onClose }: TableModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [capacity, setCapacity] = useState(initial?.capacity ?? 8);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nazwa stołu jest wymagana.');
      return;
    }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 30) {
      setError('Pojemność musi być liczbą całkowitą od 1 do 30.');
      return;
    }
    onSave({ name: name.trim(), capacity });
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Nazwa *</span>
          <input
            className="w-full rounded border border-slate-300 px-2 py-1.5"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Pojemność (1–30) *</span>
          <input
            type="number"
            min={1}
            max={30}
            className="w-full rounded border border-slate-300 px-2 py-1.5"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
            Anuluj
          </button>
          <button type="submit" className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700">
            Zapisz
          </button>
        </div>
      </form>
    </Modal>
  );
}
