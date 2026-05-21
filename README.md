# CRFC Pointage Desktop

Portage desktop de l'application CRFC Pointage avec:

- React + Vite + TypeScript
- Tauri 2
- SQLite via commandes Rust Tauri
- generation locale PDF/Excel
- ouverture de l'explorateur sur les fichiers generes

## Fonctionnalites

- connexion et gestion locale des utilisateurs
- rapport quotidien avec retards, absences et visiteurs
- historique des rapports avec export Excel
- details rapport et details employe
- gestion des employes et absences recurrentes
- imports Excel/CSV
- menu lateral gauche et modales centrees

## Lancement web local

```bash
npm install
npm run dev
```

Le mode web utilise un bridge navigateur avec `localStorage` et telechargement de fichiers.

## Verification

```bash
npm run typecheck
npm run test
npm run build
```

## Build desktop CI

Le workflow GitHub Actions Windows:

- installe Node et Rust
- lance `npm ci`
- execute typecheck, tests et build web
- compile le bundle Tauri Windows `nsis`
- publie les artefacts du `.exe`

## Dossiers clefs

- `src/` frontend React desktop
- `src-tauri/` backend Tauri/Rust + SQLite
- `.github/workflows/` build Windows en ligne
