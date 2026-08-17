# Wesele — planer rozsadzenia gości

Narzędzie osobiste, single-user, bez backendu. Cały stan trzymany w przeglądarce (IndexedDB), deploy na GitHub Pages.

Pełny plan implementacji: [SPEC.md](./SPEC.md). Kontekst dla Claude Code: [CLAUDE.md](./CLAUDE.md).

## Rozwój lokalny

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

Push do gałęzi `main` uruchamia workflow `.github/workflows/deploy.yml`, który buduje aplikację i publikuje ją na GitHub Pages. W ustawieniach repo trzeba jednorazowo włączyć **Settings → Pages → Source: GitHub Actions**.
