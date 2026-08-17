import { useMemo, useState } from 'react';
import { useSeats, useTables } from '../../db/hooks';
import {
  addTable,
  deleteTable,
  guestsFreedBySetCapacity,
  guestsSeatedAtTable,
  setTableCapacity,
  swapTableOrder,
  updateTable,
} from '../../db/repo';
import type { Guest, Table } from '../../db/types';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { TableModal, type TableFormValues } from './TableModal';
import { QuickAddTables } from './QuickAddTables';

type PendingShrink = { table: Table; newCapacity: number; freedGuests: Guest[] };
type PendingDelete = { table: Table; seatedGuests: Guest[] };

function guestName(g: Guest) {
  return `${g.firstName} ${g.lastName}`;
}

export function TablesPage() {
  const tables = useTables();
  const seats = useSeats();

  const [modalTable, setModalTable] = useState<Table | 'new' | null>(null);
  const [pendingShrink, setPendingShrink] = useState<PendingShrink | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const seatedCountByTable = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of seats) {
      if (s.guestId) map.set(s.tableId, (map.get(s.tableId) ?? 0) + 1);
    }
    return map;
  }, [seats]);

  async function handleSave(values: TableFormValues) {
    if (modalTable && modalTable !== 'new') {
      const table = modalTable;
      if (values.name !== table.name) {
        await updateTable(table.id, { name: values.name });
      }
      if (values.capacity !== table.capacity) {
        if (values.capacity < table.capacity) {
          const freedGuests = await guestsFreedBySetCapacity(table.id, values.capacity);
          if (freedGuests.length > 0) {
            setModalTable(null);
            setPendingShrink({ table, newCapacity: values.capacity, freedGuests });
            return;
          }
        }
        await setTableCapacity(table.id, values.capacity);
      }
    } else {
      await addTable({ name: values.name, capacity: values.capacity });
    }
    setModalTable(null);
  }

  async function confirmShrink() {
    if (!pendingShrink) return;
    await setTableCapacity(pendingShrink.table.id, pendingShrink.newCapacity);
    setPendingShrink(null);
  }

  async function requestDelete(table: Table) {
    const seatedGuests = await guestsSeatedAtTable(table.id);
    setPendingDelete({ table, seatedGuests });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    await deleteTable(pendingDelete.table.id);
    setPendingDelete(null);
  }

  async function move(table: Table, direction: -1 | 1) {
    const sorted = [...tables].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((t) => t.id === table.id);
    const neighbor = sorted[idx + direction];
    if (!neighbor) return;
    await swapTableOrder(table.id, neighbor.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <QuickAddTables />
        <button
          type="button"
          onClick={() => setModalTable('new')}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
        >
          + Dodaj stół
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Kolejność</th>
              <th className="px-4 py-2">Nazwa</th>
              <th className="px-4 py-2">Zajętość</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {tables.map((t, i) => (
              <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => move(t, -1)}
                      className="rounded px-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30"
                      aria-label="Przesuń wyżej"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={i === tables.length - 1}
                      onClick={() => move(t, 1)}
                      className="rounded px-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30"
                      aria-label="Przesuń niżej"
                    >
                      ↓
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2 font-medium text-slate-900">{t.name}</td>
                <td className="px-4 py-2 text-slate-600">
                  {seatedCountByTable.get(t.id) ?? 0}/{t.capacity}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => setModalTable(t)}
                    className="mr-2 text-slate-500 hover:text-slate-900"
                  >
                    Edytuj
                  </button>
                  <button type="button" onClick={() => requestDelete(t)} className="text-red-500 hover:text-red-700">
                    Usuń
                  </button>
                </td>
              </tr>
            ))}
            {tables.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Brak stołów — dodaj pierwszy powyżej.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalTable && (
        <TableModal
          title={modalTable === 'new' ? 'Nowy stół' : 'Edytuj stół'}
          initial={modalTable === 'new' ? undefined : modalTable}
          onSave={handleSave}
          onClose={() => setModalTable(null)}
        />
      )}

      {pendingShrink && (
        <ConfirmDialog
          title="Zmniejszenie pojemności"
          confirmLabel={`Zmniejsz do ${pendingShrink.newCapacity}`}
          danger
          onConfirm={confirmShrink}
          onCancel={() => setPendingShrink(null)}
        >
          <p className="mb-2">
            Stół „{pendingShrink.table.name}” zmniejszy się z {pendingShrink.table.capacity} do{' '}
            {pendingShrink.newCapacity} miejsc. Poniżsi goście wrócą do puli nieusadzonych:
          </p>
          <ul className="list-inside list-disc">
            {pendingShrink.freedGuests.map((g) => (
              <li key={g.id}>{guestName(g)}</li>
            ))}
          </ul>
        </ConfirmDialog>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Usunięcie stołu"
          confirmLabel="Usuń stół"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        >
          <p className="mb-2">
            Na pewno usunąć stół „{pendingDelete.table.name}”?
            {pendingDelete.seatedGuests.length > 0 && ' Poniżsi goście wrócą do puli nieusadzonych:'}
          </p>
          {pendingDelete.seatedGuests.length > 0 && (
            <ul className="list-inside list-disc">
              {pendingDelete.seatedGuests.map((g) => (
                <li key={g.id}>{guestName(g)}</li>
              ))}
            </ul>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
