import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Guest, Seat, Table } from '../../db/types';
import type { Selection } from './selection';
import { guestColorClass, type ColorMode } from './colors';
import type { TableWarnings } from './warnings';

type TableCardProps = {
  table: Table;
  seats: Seat[];
  guestsById: Map<string, Guest>;
  selection: Selection;
  onSlotClick: (seat: Seat) => void;
  colorMode: ColorMode;
  highlightGuestId: string | null;
  warnings: TableWarnings;
};

function SeatSlot({
  seat,
  guest,
  isSelected,
  isHighlighted,
  colorClass,
  onSlotClick,
}: {
  seat: Seat;
  guest: Guest | undefined;
  isSelected: boolean;
  isHighlighted: boolean;
  colorClass: string;
  onSlotClick: (seat: Seat) => void;
}) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: seat.id, data: { kind: 'seat', seat } });
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: seat.id,
    data: { kind: 'seat', guestId: seat.guestId ?? '', seatId: seat.id },
    disabled: !guest,
  });

  const base = guest
    ? colorClass || 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-400'
    : 'border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600';

  return (
    <button
      ref={(node) => {
        setDropRef(node);
        setDragRef(node);
      }}
      type="button"
      onClick={() => onSlotClick(seat)}
      className={`touch-none truncate rounded border px-2 py-1.5 text-left text-xs ${isDragging ? 'opacity-30' : ''} ${
        isSelected
          ? 'border-slate-900 bg-slate-900 text-white'
          : isOver
            ? 'border-slate-900 bg-slate-100'
            : base
      } ${isHighlighted ? 'ring-2 ring-offset-1 ring-amber-500' : ''}`}
      title={guest ? `${guest.firstName} ${guest.lastName}` : 'Puste miejsce'}
      {...(guest ? listeners : {})}
      {...(guest ? attributes : {})}
    >
      {guest ? `${guest.firstName} ${guest.lastName}` : '+ puste'}
    </button>
  );
}

const WARNING_ICONS: { key: keyof TableWarnings; icon: string; title: string }[] = [
  { key: 'splitPartner', icon: '💔', title: 'Para przy różnych stołach' },
  { key: 'dietary', icon: '🍽️', title: 'Gość z dietą specjalną przy tym stole' },
  { key: 'almostFull', icon: '⚠️', title: 'Zostało jedno wolne miejsce' },
];

export function TableCard({
  table,
  seats,
  guestsById,
  selection,
  onSlotClick,
  colorMode,
  highlightGuestId,
  warnings,
}: TableCardProps) {
  const filled = seats.filter((s) => s.guestId).length;
  const sorted = [...seats].sort((a, b) => a.index - b.index);
  const activeWarnings = WARNING_ICONS.filter((w) => warnings[w.key]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="font-medium text-slate-900">{table.name}</h3>
          {activeWarnings.map((w) => (
            <span key={w.key} title={w.title} className="text-sm leading-none">
              {w.icon}
            </span>
          ))}
        </div>
        <span className={`text-sm ${filled === table.capacity ? 'text-emerald-600' : 'text-slate-500'}`}>
          {filled}/{table.capacity}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {sorted.map((seat) => {
          const guest = seat.guestId ? guestsById.get(seat.guestId) : undefined;
          return (
            <SeatSlot
              key={seat.id}
              seat={seat}
              guest={guest}
              isSelected={selection?.seatId === seat.id}
              isHighlighted={!!guest && guest.id === highlightGuestId}
              colorClass={guest ? guestColorClass(guest, colorMode) : ''}
              onSlotClick={onSlotClick}
            />
          );
        })}
      </div>
    </div>
  );
}
