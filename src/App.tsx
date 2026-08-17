import { useState } from 'react';
import { GuestsPage } from './features/guests/GuestsPage';
import { ImportPage } from './features/import/ImportPage';

type Tab = 'goscie' | 'import';

const TABS: { id: Tab; label: string }[] = [
  { id: 'goscie', label: 'Goście' },
  { id: 'import', label: 'Import CSV' },
];

function App() {
  const [tab, setTab] = useState<Tab>('goscie');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold">Rozsadzenie gości weselnych</h1>
        <nav className="mt-3 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-t px-3 py-1.5 text-sm font-medium ${
                tab === t.id
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="p-6">
        {tab === 'goscie' && <GuestsPage />}
        {tab === 'import' && <ImportPage />}
      </main>
    </div>
  );
}

export default App;
