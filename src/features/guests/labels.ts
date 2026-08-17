import type { GuestSide } from '../../db/types';

export const SIDE_LABELS: Record<GuestSide, string> = {
  panna_mloda: 'Panna młoda',
  pan_mlody: 'Pan młody',
  wspolni: 'Wspólni',
};

export const SIDE_OPTIONS: GuestSide[] = ['panna_mloda', 'pan_mlody', 'wspolni'];
