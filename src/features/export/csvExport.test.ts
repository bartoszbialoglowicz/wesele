import { describe, expect, it } from 'vitest';
import { guestsToCsv } from './csvExport';
import type { Guest, Seat, Table } from '../../db/types';

function guest(overrides: Partial<Guest> & Pick<Guest, 'id' | 'firstName' | 'lastName'>): Guest {
  return { createdAt: 0, ...overrides };
}

describe('guestsToCsv', () => {
  it('sorts guests by last name and includes their table name', () => {
    const guests = [
      guest({ id: 'a', firstName: 'Jan', lastName: 'Zulu' }),
      guest({ id: 'b', firstName: 'Anna', lastName: 'Alfa', side: 'panna_mloda', isChild: true }),
    ];
    const tables: Table[] = [{ id: 't1', name: 'Stół 1', capacity: 2, order: 0 }];
    const seats: Seat[] = [{ id: 't1:0', tableId: 't1', index: 0, guestId: 'b' }];

    const csv = guestsToCsv(guests, seats, tables);
    const lines = csv.split('\r\n');

    expect(lines[0]).toBe('imie,nazwisko,strona,grupa,dieta,dziecko,uwagi,stol');
    expect(lines[1]).toContain('Anna,Alfa,Panna młoda');
    expect(lines[1]).toContain('Stół 1');
    expect(lines[2]).toContain('Jan,Zulu');
  });

  it('leaves table column empty for unseated guests', () => {
    const guests = [guest({ id: 'a', firstName: 'Jan', lastName: 'Kowalski' })];
    const csv = guestsToCsv(guests, [], []);
    expect(csv).toContain('Jan,Kowalski,,,,nie,,');
  });
});
