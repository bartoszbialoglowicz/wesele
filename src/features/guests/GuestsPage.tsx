import { useMemo, useState } from 'react';
import { useGuests, useSeatedGuestIds } from '../../db/hooks';
import { addGuest, deleteGuest, updateGuest } from '../../db/repo';
import type { Guest, GuestSide } from '../../db/types';
import { SIDE_LABELS, SIDE_OPTIONS } from './labels';
import { GuestModal, type GuestFormValues } from './GuestModal';

type SortDir = 'asc' | 'desc';

function guestName(g: Guest) {
  return `${g.firstName} ${g.lastName}`;
}

export function GuestsPage() {
  const guests = useGuests();
  const seatedIds = useSeatedGuestIds();

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [sideFilter, setSideFilter] = useState<GuestSide | ''>('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [modalGuest, setModalGuest] = useState<Guest | 'new' | null>(null);

  const groups = useMemo(
    () => Array.from(new Set(guests.map((g) => g.group).filter((g): g is string => !!g))).sort(),
    [guests],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guests
      .filter((g) => (q ? guestName(g).toLowerCase().includes(q) : true))
      .filter((g) => (groupFilter ? g.group === groupFilter : true))
      .filter((g) => (sideFilter ? g.side === sideFilter : true))
      .sort((a, b) => {
        const cmp = a.lastName.localeCompare(b.lastName, 'pl') || a.firstName.localeCompare(b.firstName, 'pl');
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [guests, search, groupFilter, sideFilter, sortDir]);

  const totalCount = guests.length;
  const childrenCount = guests.filter((g) => g.isChild).length;
  const unseatedCount = guests.filter((g) => !seatedIds.has(g.id)).length;

  async function handleSave(values: GuestFormValues) {
    const payload = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      side: values.side || undefined,
      group: values.group.trim() || undefined,
      dietary: values.dietary.trim() || undefined,
      notes: values.notes.trim() || undefined,
      isChild: values.isChild,
      partnerId: values.partnerId || undefined,
    };
    if (modalGuest && modalGuest !== 'new') {
      await updateGuest(modalGuest.id, payload);
    } else {
      await addGuest(payload);
    }
    setModalGuest(null);
  }

  async function handleDelete(guest: Guest) {
    if (confirm(`Usunąć gościa ${guestName(guest)}?`)) {
      await deleteGuest(guest.id);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Szukaj gościa…"
          className="w-64 rounded border border-slate-300 px-3 py-1.5 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
        >
          <option value="">Wszystkie grupy</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          value={sideFilter}
          onChange={(e) => setSideFilter(e.target.value as GuestSide | '')}
        >
          <option value="">Wszystkie strony</option>
          {SIDE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {SIDE_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setModalGuest('new')}
          className="ml-auto rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
        >
          + Dodaj gościa
        </button>
      </div>

      <div className="flex gap-4 text-sm text-slate-600">
        <span>
          Łącznie: <strong className="text-slate-900">{totalCount}</strong>
        </span>
        <span>
          w tym dzieci: <strong className="text-slate-900">{childrenCount}</strong>
        </span>
        <span>
          nieusadzeni: <strong className="text-slate-900">{unseatedCount}</strong>
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">
                <button
                  type="button"
                  className="font-medium hover:text-slate-900"
                  onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                >
                  Nazwisko i imię {sortDir === 'asc' ? '↑' : '↓'}
                </button>
              </th>
              <th className="px-4 py-2">Strona</th>
              <th className="px-4 py-2">Grupa</th>
              <th className="px-4 py-2">Dieta</th>
              <th className="px-4 py-2">Dziecko</th>
              <th className="px-4 py-2">Miejsce</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((g) => (
              <tr key={g.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-900">{guestName(g)}</td>
                <td className="px-4 py-2 text-slate-600">{g.side ? SIDE_LABELS[g.side] : '—'}</td>
                <td className="px-4 py-2 text-slate-600">{g.group ?? '—'}</td>
                <td className="px-4 py-2 text-slate-600">{g.dietary ?? '—'}</td>
                <td className="px-4 py-2 text-slate-600">{g.isChild ? 'tak' : '—'}</td>
                <td className="px-4 py-2 text-slate-600">
                  {seatedIds.has(g.id) ? (
                    <span className="text-emerald-600">usadzony</span>
                  ) : (
                    <span className="text-amber-600">w puli</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => setModalGuest(g)}
                    className="mr-2 text-slate-500 hover:text-slate-900"
                  >
                    Edytuj
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(g)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Usuń
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Brak gości spełniających kryteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalGuest && (
        <GuestModal
          title={modalGuest === 'new' ? 'Nowy gość' : 'Edytuj gościa'}
          initial={modalGuest === 'new' ? undefined : modalGuest}
          guests={guests}
          groups={groups}
          onSave={handleSave}
          onClose={() => setModalGuest(null)}
        />
      )}
    </div>
  );
}
