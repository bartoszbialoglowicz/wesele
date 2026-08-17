import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

export function useGuests() {
  return useLiveQuery(() => db.guests.toArray(), []) ?? [];
}

export function useSeats() {
  return useLiveQuery(() => db.seats.toArray(), []) ?? [];
}

export function useTables() {
  return useLiveQuery(() => db.seatingTables.orderBy('order').toArray(), []) ?? [];
}

export function useSeatedGuestIds(): Set<string> {
  const seats = useSeats();
  return new Set(seats.map((s) => s.guestId).filter((id): id is string => !!id));
}
