import { describe, expect, it } from 'vitest';
import { dedupeKey, guessMapping, mapRow, parseCsv } from './csv';

describe('parseCsv', () => {
  it('parses comma-separated CSV with headers', () => {
    const csv = 'imie,nazwisko,strona\nAnna,Kowalska,panna_mloda\n';
    const { headers, rows } = parseCsv(csv);
    expect(headers).toEqual(['imie', 'nazwisko', 'strona']);
    expect(rows).toEqual([{ imie: 'Anna', nazwisko: 'Kowalska', strona: 'panna_mloda' }]);
  });

  it('auto-detects semicolon delimiter', () => {
    const csv = 'imie;nazwisko\nJan;Kowalski\n';
    const { headers, rows } = parseCsv(csv);
    expect(headers).toEqual(['imie', 'nazwisko']);
    expect(rows).toEqual([{ imie: 'Jan', nazwisko: 'Kowalski' }]);
  });
});

describe('guessMapping', () => {
  it('maps known Polish headers to model fields', () => {
    const mapping = guessMapping(['imie', 'nazwisko', 'strona', 'grupa', 'dieta', 'dziecko', 'uwagi', 'losowa_kolumna']);
    expect(mapping).toEqual({
      imie: 'firstName',
      nazwisko: 'lastName',
      strona: 'side',
      grupa: 'group',
      dieta: 'dietary',
      dziecko: 'isChild',
      uwagi: 'notes',
      losowa_kolumna: 'ignore',
    });
  });
});

describe('mapRow', () => {
  it('normalizes side, boolean and trims strings', () => {
    const mapping = guessMapping(['imie', 'nazwisko', 'strona', 'dziecko']);
    const result = mapRow({ imie: ' Anna ', nazwisko: ' Kowalska ', strona: 'Panna Młoda', dziecko: 'tak' }, mapping);
    expect(result).toEqual({
      firstName: 'Anna',
      lastName: 'Kowalska',
      side: 'panna_mloda',
      group: undefined,
      dietary: undefined,
      isChild: true,
      notes: undefined,
    });
  });

  it('leaves unrecognized side as undefined', () => {
    const mapping = guessMapping(['imie', 'nazwisko', 'strona']);
    const result = mapRow({ imie: 'Anna', nazwisko: 'Kowalska', strona: 'coś dziwnego' }, mapping);
    expect(result.side).toBeUndefined();
  });
});

describe('dedupeKey', () => {
  it('is case-insensitive and trims whitespace', () => {
    expect(dedupeKey(' Anna ', 'KOWALSKA')).toBe(dedupeKey('anna', 'kowalska'));
  });
});
