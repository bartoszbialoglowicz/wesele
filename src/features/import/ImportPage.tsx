import { useMemo, useRef, useState } from 'react';
import { useGuests } from '../../db/hooks';
import { addGuest } from '../../db/repo';
import { SIDE_LABELS } from '../guests/labels';
import {
  dedupeKey,
  guessMapping,
  mapRow,
  parseCsv,
  MODEL_FIELD_LABELS,
  type ColumnMapping,
  type MappedGuest,
  type ModelField,
} from './csv';

type Step = 'upload' | 'mapping' | 'result';

type ImportRow = {
  mapped: MappedGuest;
  isDuplicate: boolean;
  include: boolean;
};

export function ImportPage() {
  const existingGuests = useGuests();
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingKeys = useMemo(
    () => new Set(existingGuests.map((g) => dedupeKey(g.firstName, g.lastName))),
    [existingGuests],
  );

  const mappedRows: ImportRow[] = useMemo(() => {
    const seenInBatch = new Set<string>();
    return rawRows.map((row) => {
      const mapped = mapRow(row, mapping);
      const key = dedupeKey(mapped.firstName, mapped.lastName);
      const isDuplicate = existingKeys.has(key) || seenInBatch.has(key);
      seenInBatch.add(key);
      return { mapped, isDuplicate, include: !isDuplicate };
    });
  }, [rawRows, mapping, existingKeys]);

  const [includeOverrides, setIncludeOverrides] = useState<Record<number, boolean>>({});

  async function handleFile(file: File) {
    setError(null);
    const text = await file.text();
    const { headers: h, rows } = parseCsv(text);
    if (h.length === 0 || rows.length === 0) {
      setError('Nie udało się odczytać pliku CSV — sprawdź, czy ma nagłówki i przynajmniej jeden wiersz danych.');
      return;
    }
    setFileName(file.name);
    setHeaders(h);
    setRawRows(rows);
    setMapping(guessMapping(h));
    setIncludeOverrides({});
    setStep('mapping');
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const hasRequiredFields =
    Object.values(mapping).includes('firstName') && Object.values(mapping).includes('lastName');

  async function handleImport() {
    let added = 0;
    let skipped = 0;
    for (let i = 0; i < mappedRows.length; i++) {
      const row = mappedRows[i];
      const include = includeOverrides[i] ?? row.include;
      if (!row.mapped.firstName || !row.mapped.lastName) {
        skipped++;
        continue;
      }
      if (!include) {
        skipped++;
        continue;
      }
      await addGuest(row.mapped);
      added++;
    }
    setResult({ added, skipped });
    setStep('result');
  }

  function reset() {
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setIncludeOverrides({});
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const duplicateCount = mappedRows.filter((r) => r.isDuplicate).length;

  return (
    <div className="space-y-4">
      {step === 'upload' && (
        <div
          className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white text-slate-500"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <p>Przeciągnij plik CSV tutaj lub</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
          >
            Wybierz plik
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {error && <p className="mt-2 max-w-md text-center text-sm text-red-600">{error}</p>}
        </div>
      )}

      {step === 'mapping' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Plik: <strong>{fileName}</strong> — {rawRows.length} wierszy. Dopasuj kolumny pliku do pól gościa.
          </p>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {headers.map((h) => (
                <label key={h} className="block text-sm">
                  <span className="mb-1 block truncate font-medium text-slate-700" title={h}>
                    {h}
                  </span>
                  <select
                    className="w-full rounded border border-slate-300 px-2 py-1.5"
                    value={mapping[h] ?? 'ignore'}
                    onChange={(e) => setMapping({ ...mapping, [h]: e.target.value as ModelField })}
                  >
                    {(Object.keys(MODEL_FIELD_LABELS) as ModelField[]).map((f) => (
                      <option key={f} value={f}>
                        {MODEL_FIELD_LABELS[f]}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            {!hasRequiredFields && (
              <p className="mb-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Wymagane pola „Imię” i „Nazwisko” muszą być zmapowane, żeby kontynuować.
              </p>
            )}

            <p className="mb-2 text-sm font-medium text-slate-700">Podgląd (pierwsze 10 wierszy)</p>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-1.5">Imię</th>
                  <th className="px-3 py-1.5">Nazwisko</th>
                  <th className="px-3 py-1.5">Strona</th>
                  <th className="px-3 py-1.5">Grupa</th>
                  <th className="px-3 py-1.5">Dieta</th>
                  <th className="px-3 py-1.5">Dziecko</th>
                  <th className="px-3 py-1.5">Duplikat?</th>
                </tr>
              </thead>
              <tbody>
                {mappedRows.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-1.5">{r.mapped.firstName || '—'}</td>
                    <td className="px-3 py-1.5">{r.mapped.lastName || '—'}</td>
                    <td className="px-3 py-1.5">{r.mapped.side ? SIDE_LABELS[r.mapped.side] : '—'}</td>
                    <td className="px-3 py-1.5">{r.mapped.group ?? '—'}</td>
                    <td className="px-3 py-1.5">{r.mapped.dietary ?? '—'}</td>
                    <td className="px-3 py-1.5">{r.mapped.isChild ? 'tak' : '—'}</td>
                    <td className="px-3 py-1.5">
                      {r.isDuplicate ? <span className="text-amber-600">tak</span> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {duplicateCount > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="mb-2 text-sm font-medium text-amber-800">
                Znaleziono {duplicateCount} potencjalnych duplikatów (po imieniu i nazwisku). Domyślnie zostaną
                pominięte — odznacz „pomiń”, żeby jednak dodać.
              </p>
              <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                {mappedRows.map((r, i) =>
                  r.isDuplicate ? (
                    <li key={i} className="flex items-center gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={includeOverrides[i] ?? r.include}
                          onChange={(e) => setIncludeOverrides({ ...includeOverrides, [i]: e.target.checked })}
                        />
                        <span>
                          {r.mapped.firstName} {r.mapped.lastName} — dodaj mimo to
                        </span>
                      </label>
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={reset} className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
              Anuluj
            </button>
            <button
              type="button"
              disabled={!hasRequiredFields}
              onClick={handleImport}
              className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Importuj {rawRows.length} wierszy
            </button>
          </div>
        </div>
      )}

      {step === 'result' && result && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-lg font-medium text-slate-900">Import zakończony</p>
          <p className="mt-2 text-slate-600">
            Dodano <strong>{result.added}</strong> gości, pominięto <strong>{result.skipped}</strong> (duplikaty lub
            brak wymaganych pól).
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
          >
            Importuj kolejny plik
          </button>
        </div>
      )}
    </div>
  );
}
