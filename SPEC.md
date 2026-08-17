# Wedding Seating Planner — spec i plan implementacji

Narzędzie osobiste, single-user, bez backendu. Cały stan w przeglądarce, deploy na GitHub Pages.

---

## 1. Stack i decyzje

| Obszar | Wybór | Uzasadnienie |
|---|---|---|
| Bundler | Vite + React + TypeScript | najprostszy setup pod GH Pages, TS łapie literówki w modelu danych |
| Storage | Dexie.js (IndexedDB) + `dexie-react-hooks` | `useLiveQuery` daje reaktywność bez globalnego store'a |
| Drag & drop | `@dnd-kit/core` | `react-beautiful-dnd` jest nieutrzymywany; dnd-kit dobrze obsługuje wiele droppable'i |
| CSV | `papaparse` | parsowanie z nagłówkami, obsługa polskich znaków i średnika |
| Routing | brak (zakładki w stanie komponentu) | jedna strona, brak potrzeby URL-i; unika problemów z `base` na GH Pages |
| Stylowanie | do wyboru — Tailwind albo CSS Modules | bez znaczenia dla logiki |

**Nie robimy:** logowania, backendu, synchronizacji, multi-user, undo/redo opartego o event sourcing, automatycznego algorytmu rozsadzania (opcjonalnie na końcu, patrz Krok 9).

---

## 2. Model danych

```ts
type Guest = {
  id: string;              // crypto.randomUUID()
  firstName: string;
  lastName: string;
  side?: 'panna_mloda' | 'pan_mlody' | 'wspolni';
  group?: string;          // np. "rodzina", "praca", "studia" — dowolny string
  notes?: string;
  dietary?: string;        // wege, bezglutenowe, alergie
  isChild?: boolean;
  partnerId?: string;      // do ostrzeżeń "para przy różnych stołach"
  createdAt: number;
};

type Table = {
  id: string;
  name: string;            // "Stół 1", "Stół młodych"
  capacity: number;        // 1..30
  order: number;           // kolejność wyświetlania
};

type Seat = {
  id: string;              // `${tableId}:${index}` — stabilne, używane jako droppable id
  tableId: string;
  index: number;           // 0-based
  guestId: string | null;
};
```

**Ważne:** miejsca (`Seat`) są bytem jawnym, nie wyliczanym z `guest.tableId`. To upraszcza drag & drop — każdy slot jest droppable'em o stałym id, a zamiana miejsc to prosty swap dwóch `guestId`.

**Niezmienniki (wymuszać w warstwie danych, nie w UI):**
- gość może siedzieć na maksymalnie jednym miejscu,
- `seats` dla stołu to zawsze dokładnie `capacity` rekordów o indeksach `0..capacity-1`,
- zmniejszenie `capacity` usuwa nadmiarowe miejsca, a siedzących tam gości zwalnia do puli (nigdy nie kasuje gościa).

Schemat Dexie:
```ts
db.version(1).stores({
  guests: 'id, lastName, group, side',
  tables: 'id, order',
  seats:  'id, tableId, guestId',
  meta:   'key',
});
```

---

## 3. Format CSV (import)

Nagłówki w pierwszym wierszu, separator `,` lub `;` (autodetekcja PapaParse), kodowanie UTF-8.

```csv
imie,nazwisko,strona,grupa,dieta,dziecko,uwagi
Anna,Kowalska,panna_mloda,rodzina,wege,nie,
Jan,Kowalski,panna_mloda,rodzina,,nie,alergia na orzechy
```

Wymagane: `imie`, `nazwisko`. Reszta opcjonalna.
UI importu musi mieć **mapowanie kolumn** (dropdown: kolumna z pliku → pole modelu) oraz **podgląd przed zapisem** — pliki od rodziny nigdy nie mają właściwych nagłówków.
Dedupe po `imie+nazwisko` (case-insensitive, trim): pokaż duplikaty i pozwól wybrać pomiń/dodaj mimo to.

---

## 4. Plan kroków dla Claude Code

Każdy krok = osobny commit, aplikacja działa po każdym kroku.

### Krok 0 — Szkielet i deploy
- `npm create vite@latest . -- --template react-ts`
- `vite.config.ts`: `base: '/<nazwa-repo>/'`
- Workflow GitHub Actions deployujący na Pages (`actions/deploy-pages`), branch `main`
- **Zdeployuj pustą aplikację i sprawdź, że się otwiera** — błędny `base` to najczęstszy problem z GH Pages, lepiej wyłapać go teraz niż na końcu

### Krok 1 — Warstwa danych
- Dexie: schemat jak wyżej
- Moduł `src/db/repo.ts` z funkcjami: `addGuest`, `updateGuest`, `deleteGuest` (zwalnia miejsce), `addTable`, `setTableCapacity` (obsługa shrink!), `deleteTable` (zwalnia gości), `assignGuestToSeat`, `swapSeats`, `unseatGuest`, `clearAll`
- `exportBackup(): Blob` (JSON ze wszystkim) i `importBackup(file)` — **zrób to teraz, nie na końcu**. IndexedDB da się skasować jednym kliknięciem w ustawieniach przeglądarki, a to jedyna kopia planu wesela.
- Testy jednostkowe warstwy danych (vitest + `fake-indexeddb`) — szczególnie shrink capacity, swap, usunięcie stołu

### Krok 2 — Lista gości
- Tabela z sortowaniem po nazwisku, wyszukiwarką i filtrem po grupie/stronie
- Dodawanie/edycja inline lub w modalu, usuwanie z potwierdzeniem
- Licznik: łącznie gości / w tym dzieci / nieusadzonych

### Krok 3 — Import CSV
- Drop pliku lub `<input type="file">`
- Mapowanie kolumn + podgląd pierwszych 10 wierszy
- Wykrywanie duplikatów, raport po imporcie ("dodano 87, pominięto 3 duplikaty")

### Krok 4 — Stoły
- CRUD stołów: nazwa, pojemność, kolejność
- Szybkie dodanie: "dodaj N stołów po M miejsc"
- Przy zmniejszaniu pojemności: dialog z listą gości, którzy wrócą do puli

### Krok 5 — Widok rozsadzania (bez DnD)
- Layout: lewy panel = pula nieusadzonych gości (z wyszukiwarką), prawa część = siatka kart stołów
- Karta stołu: nazwa, licznik `4/10`, lista slotów (pusty slot widoczny jako placeholder)
- Na razie przypisanie przez kliknięcie: wybierz gościa → kliknij slot

### Krok 6 — Drag & drop (@dnd-kit)
Draggable: gość w puli, gość na miejscu. Droppable: każdy slot (`seatId`), oraz pula (`'pool'`).

Obsłużyć wszystkie przypadki `onDragEnd`:
| Z | Na | Efekt |
|---|---|---|
| pula | pusty slot | posadź |
| pula | zajęty slot | zamień: gość siada, poprzedni wraca do puli |
| slot | pusty slot | przenieś |
| slot | zajęty slot | **swap** obu gości |
| slot | pula | zwolnij miejsce |
| cokolwiek | to samo miejsce | no-op |

- `DragOverlay` z podglądem karty gościa
- Podświetlenie slotu pod kursorem, `closestCenter` jako collision detection
- Sensory: pointer + keyboard (dostępność), `activationConstraint: { distance: 5 }` żeby klik nie łapał się jako drag

### Krok 7 — Wygoda użycia
- Kolorowanie gości po grupie lub stronie (przełącznik)
- Wyszukiwarka podświetlająca gościa na planszy
- Ostrzeżenia (nieblokujące, ikonka na karcie stołu): partnerzy przy różnych stołach, gość z dietą bez oznaczenia, stół z jednym wolnym miejscem
- Przycisk "Cofnij" dla ostatniej operacji rozsadzenia (wystarczy stos ostatnich 20 akcji w pamięci, bez persystencji)

### Krok 8 — Eksport
- Widok do druku (`@media print`): każdy stół na osobnej sekcji, lista gości alfabetycznie
- Lista "kto gdzie siedzi" posortowana po nazwisku — to jest to, co realnie wisi przy wejściu na salę
- Eksport CSV i JSON

### Krok 9 — Opcjonalnie
Auto-rozsadzanie: prosty algorytm zachłanny — grupuj po `group`, sadzaj największe grupy przy największych stołach, pary zawsze razem. Nie warto tu wchodzić w optymalizację; ręczna korekta i tak będzie potrzebna.

---

## 5. Uwagi dla Claude Code

- Trzymaj logikę operacji na miejscach w `repo.ts`, nie w komponentach. Komponenty tylko wołają funkcje i renderują wynik `useLiveQuery`.
- Wszystkie operacje modyfikujące wiele tabel opakuj w `db.transaction('rw', ...)`.
- Nie dodawaj Reduxa/Zustanda — `useLiveQuery` + parę `useState` wystarczy przy tej skali.
- Po każdym kroku: `npm run build` musi przechodzić (GH Pages deployuje build, nie dev server).
- Warto dodać `CLAUDE.md` w repo z sekcjami 1–3 tego dokumentu, żeby kontekst nie umykał między sesjami.
