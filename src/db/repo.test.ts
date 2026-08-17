import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
  addGuest,
  addTable,
  assignGuestToSeat,
  clearAll,
  deleteGuest,
  deleteTable,
  exportBackup,
  importBackup,
  setTableCapacity,
  swapSeats,
  unseatGuest,
} from './repo';

beforeEach(async () => {
  await clearAll();
});

describe('guests', () => {
  it('adds a guest and deletes it, freeing the seat', async () => {
    const guest = await addGuest({ firstName: 'Anna', lastName: 'Kowalska' });
    const table = await addTable({ name: 'Stół 1', capacity: 2 });
    const seat = (await db.seats.where('tableId').equals(table.id).first())!;
    await assignGuestToSeat(guest.id, seat.id);

    await deleteGuest(guest.id);

    const seats = await db.seats.where('tableId').equals(table.id).toArray();
    expect(seats.every((s) => s.guestId === null)).toBe(true);
    expect(await db.guests.get(guest.id)).toBeUndefined();
  });

  it('clears partnerId of others when a guest is deleted', async () => {
    const a = await addGuest({ firstName: 'Anna', lastName: 'Kowalska' });
    const b = await addGuest({ firstName: 'Jan', lastName: 'Kowalski', partnerId: a.id });

    await deleteGuest(a.id);

    const reloadedB = await db.guests.get(b.id);
    expect(reloadedB?.partnerId).toBeUndefined();
  });
});

describe('tables', () => {
  it('creates exactly `capacity` seats with indexes 0..capacity-1', async () => {
    const table = await addTable({ name: 'Stół 1', capacity: 4 });
    const seats = await db.seats.where('tableId').equals(table.id).sortBy('index');
    expect(seats).toHaveLength(4);
    expect(seats.map((s) => s.index)).toEqual([0, 1, 2, 3]);
    expect(seats.every((s) => s.guestId === null)).toBe(true);
  });

  it('shrinking capacity removes excess seats and frees seated guests to the pool', async () => {
    const table = await addTable({ name: 'Stół 1', capacity: 4 });
    const guests = await Promise.all(
      [0, 1, 2, 3].map((i) => addGuest({ firstName: `G${i}`, lastName: 'Test' })),
    );
    const seats = await db.seats.where('tableId').equals(table.id).sortBy('index');
    for (let i = 0; i < 4; i++) {
      await assignGuestToSeat(guests[i].id, seats[i].id);
    }

    await setTableCapacity(table.id, 2);

    const remainingSeats = await db.seats.where('tableId').equals(table.id).sortBy('index');
    expect(remainingSeats).toHaveLength(2);
    expect(remainingSeats.map((s) => s.index)).toEqual([0, 1]);

    // Guests that were on removed seats (index 2, 3) still exist but are unseated.
    for (const g of guests) {
      expect(await db.guests.get(g.id)).toBeDefined();
    }
    const allSeats = await db.seats.toArray();
    const seatedGuestIds = new Set(allSeats.map((s) => s.guestId).filter(Boolean));
    expect(seatedGuestIds.has(guests[2].id)).toBe(false);
    expect(seatedGuestIds.has(guests[3].id)).toBe(false);
    expect(seatedGuestIds.has(guests[0].id)).toBe(true);
    expect(seatedGuestIds.has(guests[1].id)).toBe(true);
  });

  it('growing capacity adds new empty seats without touching existing ones', async () => {
    const table = await addTable({ name: 'Stół 1', capacity: 2 });
    const guest = await addGuest({ firstName: 'Anna', lastName: 'Kowalska' });
    const seat0 = seatIdFor(table.id, 0);
    await assignGuestToSeat(guest.id, seat0);

    await setTableCapacity(table.id, 5);

    const seats = await db.seats.where('tableId').equals(table.id).sortBy('index');
    expect(seats).toHaveLength(5);
    expect(seats[0].guestId).toBe(guest.id);
    expect(seats.slice(1).every((s) => s.guestId === null)).toBe(true);
  });

  it('deleting a table removes its seats and frees seated guests', async () => {
    const table = await addTable({ name: 'Stół 1', capacity: 2 });
    const guest = await addGuest({ firstName: 'Anna', lastName: 'Kowalska' });
    await assignGuestToSeat(guest.id, seatIdFor(table.id, 0));

    await deleteTable(table.id);

    expect(await db.seatingTables.get(table.id)).toBeUndefined();
    expect(await db.seats.where('tableId').equals(table.id).count()).toBe(0);
    expect(await db.guests.get(guest.id)).toBeDefined();
  });
});

describe('seat assignment', () => {
  it('assigns a pooled guest to an empty seat', async () => {
    const table = await addTable({ name: 'Stół 1', capacity: 1 });
    const guest = await addGuest({ firstName: 'Anna', lastName: 'Kowalska' });

    await assignGuestToSeat(guest.id, seatIdFor(table.id, 0));

    const seat = await db.seats.get(seatIdFor(table.id, 0));
    expect(seat?.guestId).toBe(guest.id);
  });

  it('assigning to an occupied seat displaces the previous occupant to the pool', async () => {
    const table = await addTable({ name: 'Stół 1', capacity: 1 });
    const guestA = await addGuest({ firstName: 'Anna', lastName: 'Kowalska' });
    const guestB = await addGuest({ firstName: 'Jan', lastName: 'Kowalski' });
    await assignGuestToSeat(guestA.id, seatIdFor(table.id, 0));

    await assignGuestToSeat(guestB.id, seatIdFor(table.id, 0));

    const seat = await db.seats.get(seatIdFor(table.id, 0));
    expect(seat?.guestId).toBe(guestB.id);
    // guestA is no longer seated anywhere
    expect(await db.seats.where('guestId').equals(guestA.id).count()).toBe(0);
  });

  it('moving a seated guest frees their old seat', async () => {
    const table = await addTable({ name: 'Stół 1', capacity: 2 });
    const guest = await addGuest({ firstName: 'Anna', lastName: 'Kowalska' });
    await assignGuestToSeat(guest.id, seatIdFor(table.id, 0));

    await assignGuestToSeat(guest.id, seatIdFor(table.id, 1));

    expect((await db.seats.get(seatIdFor(table.id, 0)))?.guestId).toBeNull();
    expect((await db.seats.get(seatIdFor(table.id, 1)))?.guestId).toBe(guest.id);
  });

  it('swaps two occupied seats', async () => {
    const table = await addTable({ name: 'Stół 1', capacity: 2 });
    const guestA = await addGuest({ firstName: 'Anna', lastName: 'Kowalska' });
    const guestB = await addGuest({ firstName: 'Jan', lastName: 'Kowalski' });
    await assignGuestToSeat(guestA.id, seatIdFor(table.id, 0));
    await assignGuestToSeat(guestB.id, seatIdFor(table.id, 1));

    await swapSeats(seatIdFor(table.id, 0), seatIdFor(table.id, 1));

    expect((await db.seats.get(seatIdFor(table.id, 0)))?.guestId).toBe(guestB.id);
    expect((await db.seats.get(seatIdFor(table.id, 1)))?.guestId).toBe(guestA.id);
  });

  it('swapping a seat with itself is a no-op', async () => {
    const table = await addTable({ name: 'Stół 1', capacity: 1 });
    const guest = await addGuest({ firstName: 'Anna', lastName: 'Kowalska' });
    await assignGuestToSeat(guest.id, seatIdFor(table.id, 0));

    await swapSeats(seatIdFor(table.id, 0), seatIdFor(table.id, 0));

    expect((await db.seats.get(seatIdFor(table.id, 0)))?.guestId).toBe(guest.id);
  });

  it('unseats a guest back to the pool', async () => {
    const table = await addTable({ name: 'Stół 1', capacity: 1 });
    const guest = await addGuest({ firstName: 'Anna', lastName: 'Kowalska' });
    await assignGuestToSeat(guest.id, seatIdFor(table.id, 0));

    await unseatGuest(guest.id);

    expect((await db.seats.get(seatIdFor(table.id, 0)))?.guestId).toBeNull();
  });
});

describe('backup', () => {
  it('round-trips data through export/import', async () => {
    const table = await addTable({ name: 'Stół 1', capacity: 1 });
    const guest = await addGuest({ firstName: 'Anna', lastName: 'Kowalska' });
    await assignGuestToSeat(guest.id, seatIdFor(table.id, 0));

    const blob = await exportBackup();
    await clearAll();
    expect(await db.guests.count()).toBe(0);

    await importBackup(blob);

    expect(await db.guests.count()).toBe(1);
    expect(await db.seatingTables.count()).toBe(1);
    expect((await db.seats.get(seatIdFor(table.id, 0)))?.guestId).toBe(guest.id);
  });
});

function seatIdFor(tableId: string, index: number) {
  return `${tableId}:${index}`;
}
