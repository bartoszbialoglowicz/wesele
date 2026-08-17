import { useState } from 'react';
import { addTables } from '../../db/repo';

export function QuickAddTables() {
  const [count, setCount] = useState(1);
  const [capacity, setCapacity] = useState(8);

  async function handleAdd() {
    if (count < 1 || capacity < 1) return;
    await addTables(count, capacity);
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
      <span className="font-medium text-slate-700">Szybkie dodanie:</span>
      <label className="flex items-center gap-1">
        dodaj
        <input
          type="number"
          min={1}
          className="w-16 rounded border border-slate-300 px-2 py-1"
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        />
        stołów po
      </label>
      <label className="flex items-center gap-1">
        <input
          type="number"
          min={1}
          max={30}
          className="w-16 rounded border border-slate-300 px-2 py-1"
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
        />
        miejsc
      </label>
      <button
        type="button"
        onClick={handleAdd}
        className="rounded bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700"
      >
        Dodaj
      </button>
    </div>
  );
}
