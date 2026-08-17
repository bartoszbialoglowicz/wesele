import Dexie, { type EntityTable } from 'dexie';
import type { Guest, Table, Seat, Meta } from './types';

// Note: the object store is named `seatingTables`, not `tables` — Dexie
// reserves `db.tables` as a built-in getter for schema introspection.
export const db = new Dexie('wesele-stoly') as Dexie & {
  guests: EntityTable<Guest, 'id'>;
  seatingTables: EntityTable<Table, 'id'>;
  seats: EntityTable<Seat, 'id'>;
  meta: EntityTable<Meta, 'key'>;
};

db.version(1).stores({
  guests: 'id, lastName, group, side, partnerId',
  seatingTables: 'id, order',
  seats: 'id, tableId, guestId',
  meta: 'key',
});
