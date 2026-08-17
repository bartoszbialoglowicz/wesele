import { useState } from 'react';
import { Modal } from '../../components/Modal';
import type { Guest, GuestSide } from '../../db/types';
import { SIDE_LABELS, SIDE_OPTIONS } from './labels';

export type GuestFormValues = {
  firstName: string;
  lastName: string;
  side: GuestSide | '';
  group: string;
  dietary: string;
  notes: string;
  isChild: boolean;
  partnerId: string;
};

type GuestModalProps = {
  title: string;
  initial?: Guest;
  guests: Guest[];
  groups: string[];
  onSave: (values: GuestFormValues) => void;
  onClose: () => void;
};

function toFormValues(guest?: Guest): GuestFormValues {
  return {
    firstName: guest?.firstName ?? '',
    lastName: guest?.lastName ?? '',
    side: guest?.side ?? '',
    group: guest?.group ?? '',
    dietary: guest?.dietary ?? '',
    notes: guest?.notes ?? '',
    isChild: guest?.isChild ?? false,
    partnerId: guest?.partnerId ?? '',
  };
}

export function GuestModal({ title, initial, guests, groups, onSave, onClose }: GuestModalProps) {
  const [values, setValues] = useState<GuestFormValues>(toFormValues(initial));
  const [error, setError] = useState<string | null>(null);

  const potentialPartners = guests.filter((g) => g.id !== initial?.id);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.firstName.trim() || !values.lastName.trim()) {
      setError('Imię i nazwisko są wymagane.');
      return;
    }
    onSave(values);
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Imię *</span>
            <input
              className="w-full rounded border border-slate-300 px-2 py-1.5"
              value={values.firstName}
              onChange={(e) => setValues({ ...values, firstName: e.target.value })}
              autoFocus
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Nazwisko *</span>
            <input
              className="w-full rounded border border-slate-300 px-2 py-1.5"
              value={values.lastName}
              onChange={(e) => setValues({ ...values, lastName: e.target.value })}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Strona</span>
            <select
              className="w-full rounded border border-slate-300 px-2 py-1.5"
              value={values.side}
              onChange={(e) => setValues({ ...values, side: e.target.value as GuestSide | '' })}
            >
              <option value="">—</option>
              {SIDE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {SIDE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Grupa</span>
            <input
              className="w-full rounded border border-slate-300 px-2 py-1.5"
              value={values.group}
              onChange={(e) => setValues({ ...values, group: e.target.value })}
              list="group-options"
              placeholder="np. rodzina, praca"
            />
            <datalist id="group-options">
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Dieta / alergie</span>
          <input
            className="w-full rounded border border-slate-300 px-2 py-1.5"
            value={values.dietary}
            onChange={(e) => setValues({ ...values, dietary: e.target.value })}
            placeholder="np. wege, bezglutenowe"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Uwagi</span>
          <textarea
            className="w-full rounded border border-slate-300 px-2 py-1.5"
            rows={2}
            value={values.notes}
            onChange={(e) => setValues({ ...values, notes: e.target.value })}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.isChild}
              onChange={(e) => setValues({ ...values, isChild: e.target.checked })}
            />
            <span className="font-medium text-slate-700">Dziecko</span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Partner/-ka</span>
            <select
              className="w-full rounded border border-slate-300 px-2 py-1.5"
              value={values.partnerId}
              onChange={(e) => setValues({ ...values, partnerId: e.target.value })}
            >
              <option value="">—</option>
              {potentialPartners.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.firstName} {g.lastName}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Anuluj
          </button>
          <button
            type="submit"
            className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
          >
            Zapisz
          </button>
        </div>
      </form>
    </Modal>
  );
}
