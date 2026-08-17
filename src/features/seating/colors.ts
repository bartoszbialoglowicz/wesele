import type { Guest, GuestSide } from '../../db/types';

export type ColorMode = 'none' | 'group' | 'side';

const GROUP_PALETTE = [
  'bg-rose-100 text-rose-800 border-rose-300',
  'bg-amber-100 text-amber-800 border-amber-300',
  'bg-lime-100 text-lime-800 border-lime-300',
  'bg-emerald-100 text-emerald-800 border-emerald-300',
  'bg-cyan-100 text-cyan-800 border-cyan-300',
  'bg-blue-100 text-blue-800 border-blue-300',
  'bg-violet-100 text-violet-800 border-violet-300',
  'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
];

const SIDE_COLORS: Record<GuestSide, string> = {
  panna_mloda: 'bg-pink-100 text-pink-800 border-pink-300',
  pan_mlody: 'bg-sky-100 text-sky-800 border-sky-300',
  wspolni: 'bg-slate-200 text-slate-800 border-slate-400',
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function colorForGroup(group: string | undefined): string {
  if (!group) return '';
  return GROUP_PALETTE[hashString(group) % GROUP_PALETTE.length];
}

export function guestColorClass(guest: Guest, mode: ColorMode): string {
  if (mode === 'side') return guest.side ? SIDE_COLORS[guest.side] : '';
  if (mode === 'group') return colorForGroup(guest.group);
  return '';
}
