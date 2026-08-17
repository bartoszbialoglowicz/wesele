import Papa from 'papaparse';
import type { Guest, GuestSide } from '../../db/types';

export type ModelField = 'firstName' | 'lastName' | 'side' | 'group' | 'dietary' | 'isChild' | 'notes' | 'ignore';

export const MODEL_FIELD_LABELS: Record<ModelField, string> = {
  firstName: 'Imię',
  lastName: 'Nazwisko',
  side: 'Strona',
  group: 'Grupa',
  dietary: 'Dieta',
  isChild: 'Dziecko',
  notes: 'Uwagi',
  ignore: '— pomiń —',
};

// Guesses for the spec's example headers, matched case-insensitively.
const HEADER_GUESSES: Record<string, ModelField> = {
  imie: 'firstName',
  imię: 'firstName',
  nazwisko: 'lastName',
  strona: 'side',
  grupa: 'group',
  dieta: 'dietary',
  dziecko: 'isChild',
  uwagi: 'notes',
};

export type ColumnMapping = Record<string, ModelField>;

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimitersToGuess: [',', ';', '\t'],
  });
  const headers = result.meta.fields ?? [];
  return { headers, rows: result.data };
}

export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const h of headers) {
    mapping[h] = HEADER_GUESSES[h.trim().toLowerCase()] ?? 'ignore';
  }
  return mapping;
}

function normalizeSide(raw: string | undefined): GuestSide | undefined {
  if (!raw) return undefined;
  const key = raw.trim().toLowerCase().replace(/\s+/g, '_');
  if (key === 'panna_mloda' || key === 'panna_młoda') return 'panna_mloda';
  if (key === 'pan_mlody' || key === 'pan_młody') return 'pan_mlody';
  if (key === 'wspolni' || key === 'wspólni') return 'wspolni';
  return undefined;
}

function normalizeBool(raw: string | undefined): boolean {
  if (!raw) return false;
  const key = raw.trim().toLowerCase();
  return key === 'tak' || key === 'true' || key === '1' || key === 'yes';
}

export type MappedGuest = Omit<Guest, 'id' | 'createdAt'>;

export function mapRow(row: Record<string, string>, mapping: ColumnMapping): MappedGuest {
  const values: Record<ModelField, string | undefined> = {
    firstName: undefined,
    lastName: undefined,
    side: undefined,
    group: undefined,
    dietary: undefined,
    isChild: undefined,
    notes: undefined,
    ignore: undefined,
  };
  for (const [header, field] of Object.entries(mapping)) {
    if (field === 'ignore') continue;
    values[field] = row[header];
  }
  return {
    firstName: (values.firstName ?? '').trim(),
    lastName: (values.lastName ?? '').trim(),
    side: normalizeSide(values.side),
    group: values.group?.trim() || undefined,
    dietary: values.dietary?.trim() || undefined,
    isChild: normalizeBool(values.isChild),
    notes: values.notes?.trim() || undefined,
  };
}

export function dedupeKey(firstName: string, lastName: string): string {
  return `${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}`;
}
