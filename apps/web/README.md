# @schichtbuch/web

React + TypeScript + Vite Frontend des Instandhaltungsschichtbuchs.

## Entwicklung

```bash
pnpm --filter @schichtbuch/web dev
```

Der Dev-Server proxied `/api` auf das lokale Backend (`API_PORT`, Standard
`3000`, siehe `vite.config.ts`) – entspricht Caddys Produktiv-Routing. Für
Produktions-Builds wird die API-Basis-URL über `VITE_API_BASE_URL`
konfiguriert (siehe `.env.example` im Repo-Root).

## Struktur

- `src/app` – App-weite Provider (Query-Client, …)
- `src/routes` – Router-Definition (inkl. Route-Guards, `handle`-Metadaten für Seitentitel)
- `src/pages` – Seiten je Navigationspunkt (Dashboard, Schichtbuch, Übergabe, Berichte, Admin)
- `src/features/auth` – Login-Seite, Auth-Context, Route-Guards (`RequireAuth`, `RequirePermission`)
- `src/features/admin` – Benutzerverwaltung (Liste, Anlegen/Bearbeiten, Passwort-Reset)
- `src/components/layout` – App-Shell (Sidebar, Topbar, User-Menü)
- `src/components/ui` – shadcn/ui-Komponenten
- `src/lib` – API-Client (Axios mit Auth-Interceptor + Token-Refresh), Utilities

## Tests

```bash
pnpm --filter @schichtbuch/web test
```
