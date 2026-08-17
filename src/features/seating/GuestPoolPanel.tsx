import { useMemo, useState } from 'react';
import type { Guest } from '../../db/types';
import type { Selection } from './selection';

type GuestPoolPanelProps = {
  guests: Guest[];
  selection: Selection;
  onSelect: (guest: Guest) => void;
};

export function GuestPoolPanel({ guests, selection, onSelect }: GuestPoolPanelProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guests
      .filter((g) => (q ? `${g.firstName} ${g.lastName}`.toLowerCase().includes(q) : true))
      .sort((a, b) => a.lastName.localeCompare(b.lastName, 'pl') || a.firstName.localeCompare(b.firstName, 'pl'));
  }, [guests, search]);

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-slate-900">Pula gości</h2>
        <span className="text-sm text-slate-500">{guests.length}</span>
      </div>
      <input
        type="search"
        placeholder="Szukaj…"
        className="rounded border border-slate-300 px-3 py-1.5 text-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="flex-1 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
        {filtered.map((g) => {
          const isSelected = selection?.guestId === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onSelect(g)}
              className={`block w-full rounded px-2 py-1.5 text-left text-sm ${
                isSelected ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              {g.firstName} {g.lastName}
              {g.isChild && <span className="ml-1 text-xs opacity-70">(dziecko)</span>}
            </button>
          );
        })}
        {filtered.length === 0 && <p className="px-2 py-4 text-center text-sm text-slate-400">Brak gości.</p>}
      </div>
    </div>
  );
}
