import Papa from 'papaparse';
import type { Guest, Seat, Table } from '../../db/types';
import { SIDE_LABELS } from '../guests/labels';

export function guestsToCsv(guests: Guest[], seats: Seat[], tables: Table[]): string {
  const tableById = new Map(tables.map((t) => [t.id, t] as const));
  const tableIdByGuest = new Map<string, string>();
  for (const s of seats) {
    if (s.guestId) tableIdByGuest.set(s.guestId, s.tableId);
  }

  const rows = [...guests]
    .sort((a, b) => a.lastName.localeCompare(b.lastName, 'pl') || a.firstName.localeCompare(b.firstName, 'pl'))
    .map((g) => {
      const tableId = tableIdByGuest.get(g.id);
      return {
        imie: g.firstName,
        nazwisko: g.lastName,
        strona: g.side ? SIDE_LABELS[g.side] : '',
        grupa: g.group ?? '',
        dieta: g.dietary ?? '',
        dziecko: g.isChild ? 'tak' : 'nie',
        uwagi: g.notes ?? '',
        stol: tableId ? (tableById.get(tableId)?.name ?? '') : '',
      };
    });

  return Papa.unparse(rows);
}
