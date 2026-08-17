export type GuestSide = 'panna_mloda' | 'pan_mlody' | 'wspolni';

export type Guest = {
  id: string;
  firstName: string;
  lastName: string;
  side?: GuestSide;
  group?: string;
  notes?: string;
  dietary?: string;
  isChild?: boolean;
  partnerId?: string;
  createdAt: number;
};

export type Table = {
  id: string;
  name: string;
  capacity: number;
  order: number;
};

export type Seat = {
  id: string;
  tableId: string;
  index: number;
  guestId: string | null;
};

export type Meta = {
  key: string;
  value: unknown;
};

export type Backup = {
  version: 1;
  exportedAt: number;
  guests: Guest[];
  tables: Table[];
  seats: Seat[];
};
