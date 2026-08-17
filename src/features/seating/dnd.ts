export const POOL_DROPPABLE_ID = 'pool';

export type DragData =
  | { kind: 'pool'; guestId: string }
  | { kind: 'seat'; guestId: string; seatId: string };

export function poolDraggableId(guestId: string) {
  return `pool:${guestId}`;
}
