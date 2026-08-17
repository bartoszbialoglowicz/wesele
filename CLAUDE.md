# Wesele — planer rozsadzenia gości

Narzędzie osobiste, single-user, bez backendu. Cały stan w przeglądarce, deploy na GitHub Pages.

Pełny plan implementacji krok po kroku: [SPEC.md](./SPEC.md) — trzymaj się go, każdy krok to osobny commit, aplikacja musi działać (`npm run build` przechodzi) po każdym kroku.

## 1. Stack i decyzje

| Obszar | Wybór | Uzasadnienie |
|---|---|---|
| Bundler | Vite + React + TypeScript | najprostszy setup pod GH Pages, TS łapie literówki w modelu danych |
| Storage | Dexie.js (IndexedDB) + `dexie-react-hooks` | `useLiveQuery` daje reaktywność bez globalnego store'a |
| Drag & drop | `@dnd-kit/core` | dobrze obsługuje wiele droppable'i |
| CSV | `papaparse` | parsowanie z nagłówkami, obsługa polskich znaków i średnika |
| Routing | brak (zakładki w stanie komponentu) | jedna strona, unika problemów z `base` na GH Pages |
| Stylowanie | Tailwind CSS v4 (`@tailwindcss/vite`) | wybrane na starcie projektu |

**Nie robimy:** logowania, backendu, synchronizacji, multi-user, undo/redo opartego o event sourcing, automatycznego algorytmu rozsadzania (opcjonalnie na końcu, Krok 9).

## 2. Model danych

```ts
type Guest = {
  id: string;              // crypto.randomUUID()
  firstName: string;
  lastName: string;
  side?: 'panna_mloda' | 'pan_mlody' | 'wspolni';
  group?: string;
  notes?: string;
  dietary?: string;
  isChild?: boolean;
  partnerId?: string;
  createdAt: number;
};

type Table = {
  id: string;
  name: string;
  capacity: number;        // 1..30
  order: number;
};

type Seat = {
  id: string;              // `${tableId}:${index}` — stabilne, droppable id
  tableId: string;
  index: number;
  guestId: string | null;
};
```

Miejsca (`Seat`) są bytem jawnym, nie wyliczanym z `guest.tableId`.

**Niezmienniki (wymuszać w `repo.ts`, nie w UI):**
- gość siedzi na maksymalnie jednym miejscu,
- `seats` dla stołu to zawsze dokładnie `capacity` rekordów o indeksach `0..capacity-1`,
- zmniejszenie `capacity` usuwa nadmiarowe miejsca, siedzących tam gości zwalnia do puli (nigdy nie kasuje gościa).

## 3. Format CSV (import)

Nagłówki w pierwszym wierszu, separator `,` lub `;` (autodetekcja PapaParse), UTF-8.

```csv
imie,nazwisko,strona,grupa,dieta,dziecko,uwagi
Anna,Kowalska,panna_mloda,rodzina,wege,nie,
```

Wymagane: `imie`, `nazwisko`. UI importu ma mapowanie kolumn + podgląd przed zapisem. Dedupe po `imie+nazwisko` (case-insensitive, trim).

## Zasady pracy

- Logika operacji na miejscach w `src/db/repo.ts`, nie w komponentach.
- Operacje modyfikujące wiele tabel opakowane w `db.transaction('rw', ...)`.
- Bez Reduxa/Zustanda — `useLiveQuery` + `useState` wystarczy.
- `base` w `vite.config.ts` ustawiony na `/wesele/` — musi być zgodny z nazwą repo na GitHubie (`bartoszbialoglowicz/wesele`).
