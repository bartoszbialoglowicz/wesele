import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useGuests, useSeatedGuestIds, useSeats, useTables } from '../../db/hooks';
import { assignGuestToSeat, restoreSeatGuestIds, swapSeats, unseatGuest } from '../../db/repo';
import type { Guest, Seat } from '../../db/types';
import { GuestPoolPanel } from './GuestPoolPanel';
import { TableCard } from './TableCard';
import type { Selection } from './selection';
import type { DragData } from './dnd';
import type { ColorMode } from './colors';
import { buildGuestTableIndex, computeTableWarnings } from './warnings';

type OverData = { kind: 'pool' } | { kind: 'seat'; seat: Seat };

const MAX_HISTORY = 20;

const COLOR_MODE_OPTIONS: { id: ColorMode; label: string }[] = [
  { id: 'none', label: 'Brak' },
  { id: 'group', label: 'Grupa' },
  { id: 'side', label: 'Strona' },
];

export function SeatingPage() {
  const guests = useGuests();
  const tables = useTables();
  const seats = useSeats();
  const seatedIds = useSeatedGuestIds();

  const [selection, setSelection] = useState<Selection>(null);
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>('none');
  const [boardSearch, setBoardSearch] = useState('');
  const [history, setHistory] = useState<Seat[][]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

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
  const guestTableIndex = useMemo(() => buildGuestTableIndex(seats), [seats]);

  const highlightGuestId = useMemo(() => {
    const q = boardSearch.trim().toLowerCase();
    if (!q) return null;
    const match = guests.find((g) => `${g.firstName} ${g.lastName}`.toLowerCase().includes(q));
    return match?.id ?? null;
  }, [boardSearch, guests]);

  function pushHistory() {
    setHistory((prev) => [...prev, seats].slice(-MAX_HISTORY));
  }

  async function handleUndo() {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      void restoreSeatGuestIds(last);
      return prev.slice(0, -1);
    });
  }

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
      setSelection(null);
      return;
    }

    pushHistory();
    if (!seat.guestId) {
      await assignGuestToSeat(selection.guestId, seat.id);
    } else if (selection.seatId) {
      await swapSeats(selection.seatId, seat.id);
    } else {
      await assignGuestToSeat(selection.guestId, seat.id);
    }
    setSelection(null);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDrag((event.active.data.current as DragData) ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDrag(null);
    if (!over) return;

    const activeData = active.data.current as DragData;
    const overData = over.data.current as OverData;

    if (activeData.kind === 'pool') {
      if (overData.kind === 'seat') {
        pushHistory();
        await assignGuestToSeat(activeData.guestId, overData.seat.id);
      }
      return;
    }

    // activeData.kind === 'seat'
    if (overData.kind === 'pool') {
      pushHistory();
      await unseatGuest(activeData.guestId);
      return;
    }

    if (overData.seat.id === activeData.seatId) return; // dropped on itself: no-op

    pushHistory();
    if (!overData.seat.guestId) {
      await assignGuestToSeat(activeData.guestId, overData.seat.id);
    } else {
      await swapSeats(activeData.seatId, overData.seat.id);
    }
  }

  const activeDragGuest = activeDrag ? guestsById.get(activeDrag.guestId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Znajdź gościa na planszy…"
          className="w-64 rounded border border-slate-300 px-3 py-1.5 text-sm"
          value={boardSearch}
          onChange={(e) => setBoardSearch(e.target.value)}
        />
        <div className="flex items-center gap-1 text-sm">
          <span className="text-slate-500">Kolor wg:</span>
          {COLOR_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setColorMode(opt.id)}
              className={`rounded px-2 py-1 ${
                colorMode === opt.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleUndo}
          disabled={history.length === 0}
          className="ml-auto rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ↶ Cofnij {history.length > 0 && `(${history.length})`}
        </button>
      </div>

      <div className="flex gap-4">
        <GuestPoolPanel
          guests={poolGuests}
          selection={selection}
          onSelect={handlePoolSelect}
          colorMode={colorMode}
          highlightGuestId={highlightGuestId}
        />
        <div className="grid flex-1 grid-cols-1 gap-3 self-start sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((t) => (
            <TableCard
              key={t.id}
              table={t}
              seats={seatsByTable.get(t.id) ?? []}
              guestsById={guestsById}
              selection={selection}
              onSlotClick={handleSlotClick}
              colorMode={colorMode}
              highlightGuestId={highlightGuestId}
              warnings={computeTableWarnings(t, seatsByTable.get(t.id) ?? [], guestsById, guestTableIndex)}
            />
          ))}
          {tables.length === 0 && (
            <p className="col-span-full py-8 text-center text-slate-400">
              Brak stołów — dodaj je w zakładce „Stoły”.
            </p>
          )}
        </div>
      </div>
      <DragOverlay>
        {activeDragGuest && (
          <div className="rounded border border-slate-900 bg-slate-900 px-2 py-1.5 text-xs text-white shadow-lg">
            {activeDragGuest.firstName} {activeDragGuest.lastName}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
