import { useMemo, useState } from 'react';
import { useGuests, useSeatedGuestIds, useSeats, useTables } from '../../db/hooks';
import { assignGuestToSeat, swapSeats } from '../../db/repo';
import type { Guest, Seat } from '../../db/types';
import { GuestPoolPanel } from './GuestPoolPanel';
import { TableCard } from './TableCard';
import type { Selection } from './selection';

export function SeatingPage() {
  const guests = useGuests();
  const tables = useTables();
  const seats = useSeats();
  const seatedIds = useSeatedGuestIds();

  const [selection, setSelection] = useState<Selection>(null);

  const poolGuests = useMemo(() => guests.filter((g) => !seatedIds.has(g.id)), [guests, seatedIds]);
  const guestsById = useMemo(() => new Map(guests.map((g) => [g.id, g] as const)), [guests]);
  const seatsByTable = useMemo(() => {
    const map = new Map<string, Seat[]>();
    for (const s of seats) {
      const list = map.get(s.tableId) ?? [];
      list.push(s);
      map.set(s.tableId, list);
    }
    return map;
  }, [seats]);

  function handlePoolSelect(guest: Guest) {
    setSelection((prev) => (prev?.guestId === guest.id ? null : { guestId: guest.id, seatId: null }));
  }

  async function handleSlotClick(seat: Seat) {
    if (!selection) {
      if (seat.guestId) {
        setSelection({ guestId: seat.guestId, seatId: seat.id });
      }
      return;
    }

    if (selection.guestId === seat.guestId) {
      // Clicked the seat the selected guest already occupies — deselect.
      setSelection(null);
      return;
    }

    if (!seat.guestId) {
      await assignGuestToSeat(selection.guestId, seat.id);
    } else if (selection.seatId) {
      await swapSeats(selection.seatId, seat.id);
    } else {
      await assignGuestToSeat(selection.guestId, seat.id);
    }
    setSelection(null);
  }

  return (
    <div className="flex gap-4">
      <GuestPoolPanel guests={poolGuests} selection={selection} onSelect={handlePoolSelect} />
      <div className="grid flex-1 grid-cols-1 gap-3 self-start sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((t) => (
          <TableCard
            key={t.id}
            table={t}
            seats={seatsByTable.get(t.id) ?? []}
            guestsById={guestsById}
            selection={selection}
            onSlotClick={handleSlotClick}
          />
        ))}
        {tables.length === 0 && (
          <p className="col-span-full py-8 text-center text-slate-400">
            Brak stołów — dodaj je w zakładce „Stoły”.
          </p>
        )}
      </div>
    </div>
  );
}
