import { useMemo, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Guest } from '../../db/types';
import type { Selection } from './selection';
import { POOL_DROPPABLE_ID, poolDraggableId } from './dnd';
import { guestColorClass, type ColorMode } from './colors';

type GuestPoolPanelProps = {
  guests: Guest[];
  selection: Selection;
  onSelect: (guest: Guest) => void;
  colorMode: ColorMode;
  highlightGuestId: string | null;
};

function PoolGuestItem({
  guest,
  isSelected,
  isHighlighted,
  colorClass,
  onSelect,
}: {
  guest: Guest;
  isSelected: boolean;
  isHighlighted: boolean;
  colorClass: string;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: poolDraggableId(guest.id),
    data: { kind: 'pool', guestId: guest.id },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      className={`block w-full touch-none rounded border border-transparent px-2 py-1.5 text-left text-sm ${
        isSelected ? 'bg-slate-900 text-white' : colorClass || 'text-slate-700 hover:bg-slate-100'
      } ${isDragging ? 'opacity-30' : ''} ${isHighlighted ? 'ring-2 ring-offset-1 ring-amber-500' : ''}`}
      {...listeners}
      {...attributes}
    >
      {guest.firstName} {guest.lastName}
      {guest.isChild && <span className="ml-1 text-xs opacity-70">(dziecko)</span>}
    </button>
  );
}

export function GuestPoolPanel({ guests, selection, onSelect, colorMode, highlightGuestId }: GuestPoolPanelProps) {
  const [search, setSearch] = useState('');
  const { setNodeRef, isOver } = useDroppable({ id: POOL_DROPPABLE_ID, data: { kind: 'pool' } });

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
      <div
        ref={setNodeRef}
        className={`min-h-24 flex-1 space-y-1 overflow-y-auto rounded-lg border p-2 ${
          isOver ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
        }`}
      >
        {filtered.map((g) => (
          <PoolGuestItem
            key={g.id}
            guest={g}
            isSelected={selection?.guestId === g.id}
            isHighlighted={g.id === highlightGuestId}
            colorClass={guestColorClass(g, colorMode)}
            onSelect={() => onSelect(g)}
          />
        ))}
        {filtered.length === 0 && <p className="px-2 py-4 text-center text-sm text-slate-400">Brak gości.</p>}
      </div>
    </div>
  );
}
