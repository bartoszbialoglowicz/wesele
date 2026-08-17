import type { Guest, Seat, Table } from '../../db/types';
import type { Selection } from './selection';

type TableCardProps = {
  table: Table;
  seats: Seat[];
  guestsById: Map<string, Guest>;
  selection: Selection;
  onSlotClick: (seat: Seat) => void;
};

export function TableCard({ table, seats, guestsById, selection, onSlotClick }: TableCardProps) {
  const filled = seats.filter((s) => s.guestId).length;
  const sorted = [...seats].sort((a, b) => a.index - b.index);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium text-slate-900">{table.name}</h3>
        <span className={`text-sm ${filled === table.capacity ? 'text-emerald-600' : 'text-slate-500'}`}>
          {filled}/{table.capacity}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {sorted.map((seat) => {
          const guest = seat.guestId ? guestsById.get(seat.guestId) : undefined;
          const isSelected = selection?.seatId === seat.id;
          return (
            <button
              key={seat.id}
              type="button"
              onClick={() => onSlotClick(seat)}
              className={`truncate rounded border px-2 py-1.5 text-left text-xs ${
                isSelected
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : guest
                    ? 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-400'
                    : 'border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600'
              }`}
              title={guest ? `${guest.firstName} ${guest.lastName}` : 'Puste miejsce'}
            >
              {guest ? `${guest.firstName} ${guest.lastName}` : '+ puste'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
