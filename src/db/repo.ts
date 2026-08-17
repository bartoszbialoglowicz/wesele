import { db } from './db';
import type { Guest, Table, Seat, Backup } from './types';

const genId = () => crypto.randomUUID();

function seatId(tableId: string, index: number) {
  return `${tableId}:${index}`;
}

// ---------- Guests ----------

export async function addGuest(input: Omit<Guest, 'id' | 'createdAt'>): Promise<Guest> {
  const guest: Guest = { ...input, id: genId(), createdAt: Date.now() };
  await db.guests.add(guest);
  return guest;
}

export async function updateGuest(id: string, patch: Partial<Omit<Guest, 'id'>>): Promise<void> {
  await db.guests.update(id, patch);
}

export async function deleteGuest(id: string): Promise<void> {
  await db.transaction('rw', db.guests, db.seats, async () => {
    const seat = await db.seats.where('guestId').equals(id).first();
    if (seat) {
      await db.seats.update(seat.id, { guestId: null });
    }
    const partners = await db.guests.where('partnerId').equals(id).toArray();
    for (const p of partners) {
      await db.guests.update(p.id, { partnerId: undefined });
    }
    await db.guests.delete(id);
  });
}

// ---------- Tables ----------

export async function addTable(input: { name: string; capacity: number; order?: number }): Promise<Table> {
  return db.transaction('rw', db.seatingTables, db.seats, async () => {
    const order = input.order ?? (await db.seatingTables.count());
    const table: Table = { id: genId(), name: input.name, capacity: input.capacity, order };
    await db.seatingTables.add(table);
    const seats: Seat[] = Array.from({ length: input.capacity }, (_, index) => ({
      id: seatId(table.id, index),
      tableId: table.id,
      index,
      guestId: null,
    }));
    await db.seats.bulkAdd(seats);
    return table;
  });
}

export async function addTables(count: number, capacity: number, namePrefix = 'Stół'): Promise<Table[]> {
  const startOrder = await db.seatingTables.count();
  const created: Table[] = [];
  for (let i = 0; i < count; i++) {
    const table = await addTable({ name: `${namePrefix} ${startOrder + i + 1}`, capacity, order: startOrder + i });
    created.push(table);
  }
  return created;
}

export async function updateTable(id: string, patch: Partial<Pick<Table, 'name' | 'order'>>): Promise<void> {
  await db.seatingTables.update(id, patch);
}

export async function swapTableOrder(idA: string, idB: string): Promise<void> {
  await db.transaction('rw', db.seatingTables, async () => {
    const [a, b] = await Promise.all([db.seatingTables.get(idA), db.seatingTables.get(idB)]);
    if (!a || !b) throw new Error('Table not found');
    await db.seatingTables.update(a.id, { order: b.order });
    await db.seatingTables.update(b.id, { order: a.order });
  });
}

/** Guests currently seated at a table — used to warn before deleting it. */
export async function guestsSeatedAtTable(tableId: string): Promise<Guest[]> {
  const seats = await db.seats.where('tableId').equals(tableId).toArray();
  const guestIds = seats.map((s) => s.guestId).filter((id): id is string => !!id);
  if (guestIds.length === 0) return [];
  return db.guests.bulkGet(guestIds).then((gs) => gs.filter((g): g is Guest => !!g));
}

/** Returns the guests that will be freed to the pool if capacity shrinks, without applying the change. */
export async function guestsFreedBySetCapacity(tableId: string, newCapacity: number): Promise<Guest[]> {
  const seats = await db.seats.where('tableId').equals(tableId).toArray();
  const toRemove = seats.filter((s) => s.index >= newCapacity && s.guestId);
  const guestIds = toRemove.map((s) => s.guestId!) as string[];
  if (guestIds.length === 0) return [];
  return db.guests.bulkGet(guestIds).then((gs) => gs.filter((g): g is Guest => !!g));
}

export async function setTableCapacity(tableId: string, newCapacity: number): Promise<void> {
  await db.transaction('rw', db.seatingTables, db.seats, async () => {
    const table = await db.seatingTables.get(tableId);
    if (!table) throw new Error(`Table ${tableId} not found`);
    const seats = await db.seats.where('tableId').equals(tableId).toArray();
    const currentCapacity = table.capacity;

    if (newCapacity < currentCapacity) {
      const removeIds = seats.filter((s) => s.index >= newCapacity).map((s) => s.id);
      await db.seats.bulkDelete(removeIds);
    } else if (newCapacity > currentCapacity) {
      const existingIndexes = new Set(seats.map((s) => s.index));
      const newSeats: Seat[] = [];
      for (let index = currentCapacity; index < newCapacity; index++) {
        if (!existingIndexes.has(index)) {
          newSeats.push({ id: seatId(tableId, index), tableId, index, guestId: null });
        }
      }
      await db.seats.bulkAdd(newSeats);
    }

    await db.seatingTables.update(tableId, { capacity: newCapacity });
  });
}

export async function deleteTable(id: string): Promise<void> {
  await db.transaction('rw', db.seatingTables, db.seats, async () => {
    const seats = await db.seats.where('tableId').equals(id).toArray();
    await db.seats.bulkDelete(seats.map((s) => s.id));
    await db.seatingTables.delete(id);
  });
}

// ---------- Seats ----------

export async function assignGuestToSeat(guestId: string, targetSeatId: string): Promise<void> {
  await db.transaction('rw', db.seats, async () => {
    const targetSeat = await db.seats.get(targetSeatId);
    if (!targetSeat) throw new Error(`Seat ${targetSeatId} not found`);

    const currentSeat = await db.seats.where('guestId').equals(guestId).first();
    if (currentSeat && currentSeat.id === targetSeatId) return; // no-op: same seat

    if (currentSeat) {
      await db.seats.update(currentSeat.id, { guestId: null });
    }

    // Whoever was in the target seat goes back to the pool.
    await db.seats.update(targetSeatId, { guestId });
  });
}

export async function swapSeats(seatIdA: string, seatIdB: string): Promise<void> {
  if (seatIdA === seatIdB) return; // no-op
  await db.transaction('rw', db.seats, async () => {
    const [a, b] = await Promise.all([db.seats.get(seatIdA), db.seats.get(seatIdB)]);
    if (!a || !b) throw new Error('Seat not found');
    await db.seats.update(a.id, { guestId: b.guestId });
    await db.seats.update(b.id, { guestId: a.guestId });
  });
}

export async function unseatGuest(guestId: string): Promise<void> {
  await db.transaction('rw', db.seats, async () => {
    const seat = await db.seats.where('guestId').equals(guestId).first();
    if (seat) {
      await db.seats.update(seat.id, { guestId: null });
    }
  });
}

/** Restores seat occupancy from a snapshot (used for seating undo). Seats that no longer exist are skipped. */
export async function restoreSeatGuestIds(snapshot: Pick<Seat, 'id' | 'guestId'>[]): Promise<void> {
  await db.transaction('rw', db.seats, async () => {
    for (const s of snapshot) {
      const current = await db.seats.get(s.id);
      if (current) {
        await db.seats.update(s.id, { guestId: s.guestId });
      }
    }
  });
}

// ---------- Bulk / backup ----------

export async function clearAll(): Promise<void> {
  await db.transaction('rw', db.guests, db.seatingTables, db.seats, db.meta, async () => {
    await Promise.all([db.guests.clear(), db.seatingTables.clear(), db.seats.clear(), db.meta.clear()]);
  });
}

export async function exportBackup(): Promise<Blob> {
  const [guests, tables, seats] = await Promise.all([
    db.guests.toArray(),
    db.seatingTables.toArray(),
    db.seats.toArray(),
  ]);
  const backup: Backup = { version: 1, exportedAt: Date.now(), guests, tables, seats };
  return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
}

export async function importBackup(file: File | Blob): Promise<void> {
  const text = await file.text();
  const data = JSON.parse(text) as Backup;
  if (!data || data.version !== 1 || !Array.isArray(data.guests) || !Array.isArray(data.tables) || !Array.isArray(data.seats)) {
    throw new Error('Nieprawidłowy plik kopii zapasowej');
  }
  await db.transaction('rw', db.guests, db.seatingTables, db.seats, async () => {
    await Promise.all([db.guests.clear(), db.seatingTables.clear(), db.seats.clear()]);
    await db.guests.bulkAdd(data.guests);
    await db.seatingTables.bulkAdd(data.tables);
    await db.seats.bulkAdd(data.seats);
  });
}
