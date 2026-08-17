import type { Guest, Seat, Table } from '../../db/types';

export type TableWarnings = {
  splitPartner: boolean;
  dietary: boolean;
  almostFull: boolean;
};

export function buildGuestTableIndex(seats: Seat[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const s of seats) {
    if (s.guestId) map.set(s.guestId, s.tableId);
  }
  return map;
}

export function computeTableWarnings(
  table: Table,
  seatsForTable: Seat[],
  guestsById: Map<string, Guest>,
  guestTableIndex: Map<string, string>,
): TableWarnings {
  const seatedGuests = seatsForTable
    .map((s) => (s.guestId ? guestsById.get(s.guestId) : undefined))
    .filter((g): g is Guest => !!g);

  const splitPartner = seatedGuests.some((g) => {
    if (!g.partnerId) return false;
    const partnerTableId = guestTableIndex.get(g.partnerId);
    return partnerTableId !== undefined && partnerTableId !== table.id;
  });

  const dietary = seatedGuests.some((g) => !!g.dietary);

  const filled = seatsForTable.filter((s) => s.guestId).length;
  const almostFull = table.capacity - filled === 1;

  return { splitPartner, dietary, almostFull };
}
