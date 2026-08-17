import { useMemo, useRef } from 'react';
import { useGuests, useSeats, useTables } from '../../db/hooks';
import { exportBackup, importBackup } from '../../db/repo';
import type { Guest } from '../../db/types';
import { downloadBlob } from '../../lib/download';
import { guestsToCsv } from './csvExport';

function guestName(g: Guest) {
  return `${g.firstName} ${g.lastName}`;
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function ExportPage() {
  const guests = useGuests();
  const tables = useTables();
  const seats = useSeats();
  const backupInputRef = useRef<HTMLInputElement>(null);

  const tableById = useMemo(() => new Map(tables.map((t) => [t.id, t] as const)), [tables]);
  const tableIdByGuest = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of seats) {
      if (s.guestId) map.set(s.guestId, s.tableId);
    }
    return map;
  }, [seats]);

  const alphabetical = useMemo(
    () =>
      [...guests].sort(
        (a, b) => a.lastName.localeCompare(b.lastName, 'pl') || a.firstName.localeCompare(b.firstName, 'pl'),
      ),
    [guests],
  );

  const guestsByTable = useMemo(() => {
    const map = new Map<string, Guest[]>();
    for (const g of guests) {
      const tableId = tableIdByGuest.get(g.id);
      if (!tableId) continue;
      const list = map.get(tableId) ?? [];
      list.push(g);
      map.set(tableId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.lastName.localeCompare(b.lastName, 'pl') || a.firstName.localeCompare(b.firstName, 'pl'));
    }
    return map;
  }, [guests, tableIdByGuest]);

  const unseated = alphabetical.filter((g) => !tableIdByGuest.has(g.id));

  function handleExportCsv() {
    const csv = guestsToCsv(guests, seats, tables);
    downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `wesele-goscie-${todayStamp()}.csv`);
  }

  async function handleExportJson() {
    const blob = await exportBackup();
    downloadBlob(blob, `wesele-kopia-zapasowa-${todayStamp()}.json`);
  }

  async function handleImportBackup(file: File) {
    if (!confirm('Import kopii zapasowej zastąpi WSZYSTKIE obecne dane (goście, stoły, rozsadzenie). Kontynuować?')) {
      return;
    }
    await importBackup(file);
    if (backupInputRef.current) backupInputRef.current.value = '';
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
        >
          🖨️ Drukuj
        </button>
        <button
          type="button"
          onClick={handleExportCsv}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          Eksportuj CSV
        </button>
        <button
          type="button"
          onClick={handleExportJson}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          Eksportuj kopię zapasową (JSON)
        </button>
        <button
          type="button"
          onClick={() => backupInputRef.current?.click()}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          Importuj kopię zapasową
        </button>
        <input
          ref={backupInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportBackup(file);
          }}
        />
      </div>

      <div className="print-area space-y-8">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">Kto gdzie siedzi</h2>
          <table className="w-full max-w-xl text-sm">
            <tbody>
              {alphabetical.map((g) => {
                const tableId = tableIdByGuest.get(g.id);
                return (
                  <tr key={g.id} className="border-b border-slate-100">
                    <td className="py-1 pr-4">{guestName(g)}</td>
                    <td className="py-1 text-slate-600">
                      {tableId ? tableById.get(tableId)?.name : <span className="italic">nieusadzony/a</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">Stoły</h2>
          {tables.map((t) => (
            <div key={t.id} className="break-inside-avoid">
              <h3 className="font-medium text-slate-900">
                {t.name} <span className="font-normal text-slate-500">({(guestsByTable.get(t.id) ?? []).length}/{t.capacity})</span>
              </h3>
              <ul className="ml-4 list-disc text-sm">
                {(guestsByTable.get(t.id) ?? []).map((g) => (
                  <li key={g.id}>{guestName(g)}</li>
                ))}
                {(guestsByTable.get(t.id) ?? []).length === 0 && <li className="italic text-slate-400">brak gości</li>}
              </ul>
            </div>
          ))}
          {unseated.length > 0 && (
            <div className="break-inside-avoid">
              <h3 className="font-medium text-slate-900">Nieusadzeni</h3>
              <ul className="ml-4 list-disc text-sm">
                {unseated.map((g) => (
                  <li key={g.id}>{guestName(g)}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
