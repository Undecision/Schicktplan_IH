# @schichtbuch/web

React + TypeScript + Vite Frontend des Instandhaltungsschichtbuchs.

## Entwicklung

```bash
pnpm --filter @schichtbuch/web dev
```

Die API-Basis-URL wird über `VITE_API_BASE_URL` konfiguriert (siehe `.env.example` im Repo-Root).

## Struktur

- `src/app` – App-weite Provider (Query-Client, …)
- `src/routes` – Router-Definition
- `src/pages` – Seiten je Navigationspunkt (Dashboard, Schichtbuch, Übergabe, Berichte, Admin)
- `src/components/layout` – App-Shell, Navigation
- `src/components/ui` – shadcn/ui-Komponenten
- `src/lib` – API-Client (Axios + Auth-Interceptor), Utilities

## Tests

```bash
pnpm --filter @schichtbuch/web test
```
