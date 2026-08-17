import { GuestsPage } from './features/guests/GuestsPage';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold">Rozsadzenie gości weselnych</h1>
      </header>
      <main className="p-6">
        <GuestsPage />
      </main>
    </div>
  );
}

export default App;
