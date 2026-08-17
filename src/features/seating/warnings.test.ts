import { describe, expect, it } from 'vitest';
import { buildGuestTableIndex, computeTableWarnings } from './warnings';
import type { Guest, Seat, Table } from '../../db/types';

function guest(overrides: Partial<Guest> & Pick<Guest, 'id'>): Guest {
  return { firstName: 'X', lastName: 'Y', createdAt: 0, ...overrides };
}

function seat(id: string, tableId: string, index: number, guestId: string | null): Seat {
  return { id, tableId, index, guestId };
}

describe('computeTableWarnings', () => {
  const table1: Table = { id: 't1', name: 'Stół 1', capacity: 3, order: 0 };

  it('flags partners seated at different tables', () => {
    const a = guest({ id: 'a', partnerId: 'b' });
    const b = guest({ id: 'b', partnerId: 'a' });
    const seats = [seat('t1:0', 't1', 0, 'a'), seat('t2:0', 't2', 0, 'b')];
    const guestsById = new Map([
      ['a', a],
      ['b', b],
    ]);
    const index = buildGuestTableIndex(seats);

    const warnings = computeTableWarnings(table1, [seats[0]], guestsById, index);

    expect(warnings.splitPartner).toBe(true);
  });

  it('does not flag partners at the same table', () => {
    const a = guest({ id: 'a', partnerId: 'b' });
    const b = guest({ id: 'b', partnerId: 'a' });
    const seats = [seat('t1:0', 't1', 0, 'a'), seat('t1:1', 't1', 1, 'b')];
    const guestsById = new Map([
      ['a', a],
      ['b', b],
    ]);
    const index = buildGuestTableIndex(seats);

    const warnings = computeTableWarnings(table1, seats, guestsById, index);

    expect(warnings.splitPartner).toBe(false);
  });

  it('does not flag when the partner is unseated', () => {
    const a = guest({ id: 'a', partnerId: 'b' });
    const seats = [seat('t1:0', 't1', 0, 'a')];
    const guestsById = new Map([['a', a]]);
    const index = buildGuestTableIndex(seats);

    const warnings = computeTableWarnings(table1, seats, guestsById, index);

    expect(warnings.splitPartner).toBe(false);
  });

  it('flags a table with a seated guest that has dietary needs', () => {
    const a = guest({ id: 'a', dietary: 'wege' });
    const seats = [seat('t1:0', 't1', 0, 'a')];
    const guestsById = new Map([['a', a]]);

    const warnings = computeTableWarnings(table1, seats, guestsById, new Map());

    expect(warnings.dietary).toBe(true);
  });

  it('flags a table with exactly one free seat', () => {
    const a = guest({ id: 'a' });
    const b = guest({ id: 'b' });
    const seats = [seat('t1:0', 't1', 0, 'a'), seat('t1:1', 't1', 1, 'b'), seat('t1:2', 't1', 2, null)];
    const guestsById = new Map([
      ['a', a],
      ['b', b],
    ]);

    const warnings = computeTableWarnings(table1, seats, guestsById, new Map());

    expect(warnings.almostFull).toBe(true);
  });

  it('does not flag a fully empty or fully seated table as almost full', () => {
    const seatsEmpty = [seat('t1:0', 't1', 0, null), seat('t1:1', 't1', 1, null)];
    const warningsEmpty = computeTableWarnings({ ...table1, capacity: 2 }, seatsEmpty, new Map(), new Map());
    expect(warningsEmpty.almostFull).toBe(false);

    const a = guest({ id: 'a' });
    const b = guest({ id: 'b' });
    const seatsFull = [seat('t1:0', 't1', 0, 'a'), seat('t1:1', 't1', 1, 'b')];
    const guestsById = new Map([
      ['a', a],
      ['b', b],
    ]);
    const warningsFull = computeTableWarnings({ ...table1, capacity: 2 }, seatsFull, guestsById, new Map());
    expect(warningsFull.almostFull).toBe(false);
  });
});
