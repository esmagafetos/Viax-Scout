# ViaX:Trace

## Overview

Full SaaS web application for validating delivery route XLSX/CSV files against GPS coordinates.
pnpm workspace monorepo with React+Vite frontend and Express API backend.

## Project

**ViaX:Trace** (v8.0) — Brazilian Portuguese SaaS logistics auditing platform.
- Auth: session-based (express-session + bcryptjs)
- Design: warm amber/orange→purple gradient palette (`#d4521a` → `#9333ea` accent), Poppins font, glassmorphism blur, 14px radius cards
- UI language: Brazilian Portuguese throughout
- Features: Login/Register, Dashboard stats, Route Processing (XLSX/CSV upload via SSE), History, 6-tab Settings (Perfil + Financeiro + Instâncias + Parser + Tolerância + **Sobre**)
- Mobile-first design: frosted-glass header, horizontal mobile nav, responsive grids, hide-mobile/show-mobile CSS helpers
- Profile dropdown in nav: Configurações / Perfil / Sair + avatar picker from device gallery
- Geocoder: coordinate-first validation — reverse geocode spreadsheet GPS with **Photon (primary) → Overpass API (secondary, multi-mirror, radius 40m→90m) → Nominatim (last resort)**; forward geocoding also Photon-first. Google Maps available as premium option via `instanceMode: "googlemaps"`.
- Process: SSE-based XLSX/CSV upload (fetch + ReadableStream), max 500 addresses, 10MB file limit
- Avatar: stored as base64 data URL in DB, uploaded via multipart POST
- **Mobile (Expo SDK 54, expo-router)**: paridade 1:1 com a web — Docs page completa, Toast global (`<ToastProvider>` em `_layout.tsx`), primitivos `Progress`/`Skeleton`/`Accordion`/`SectionCard`, tokens `okDim`/`destructive`/`Shadows`, export CSV real (expo-file-system/legacy + expo-sharing) em Process e Tool, avatar upload via `expo-image-picker` → multipart `/api/users/avatar`

## Branding

- **Brand name**: ViaX:Trace (replaces "ViaX: System")
- **Logo component**: `artifacts/viax-scout/src/components/ViaXLogo.tsx`
  - `ViaXLogo` — Horizontal wordmark with icon + "ViaX:Trace" + "AUDITORIA DE ROTAS" tagline
  - `LogoIcon` — Standalone SVG mark: start dot + bezier curve + orange endpoint pin
  - `AppIcon` — Square app icon (light/dark) 
  - `GitHubBanner` — Full project banner used in Docs page
- **Design exports**: `design-exports/` — Screenshots of logo variants (showcase, light, dark, github banner)
- **Accent**: `#d4521a` orange → warm dark browns for gradients
- **Color gradient**: `linear-gradient(135deg, #1a0e08 0%, #2d1408 40%, #3d1c0c 70%, #1f0a18 100%)`

## Artifacts

1. **API Server** (`artifacts/api-server`) — Express 5, port 8080
   - Routes: `/api/auth/*`, `/api/users/*`, `/api/analyses/*`, `/api/dashboard/*`, `/api/process/upload`
   - `lib/geocoder.ts` — address parser + coordinate-first Photon/Overpass/Nominatim/BrasilAPI/Google Maps validation pipeline
2. **ViaX Scout** (`artifacts/viax-scout`) — React+Vite frontend, port 5173
   - Proxy: `/api/*` → `http://localhost:8080` (Vite proxy config)
   - Pages: Login, Register, Setup, Dashboard, Process, History, Settings
3. **ViaX Mobile** (`artifacts/viax-mobile`, v2.0.0) — Expo SDK 54 Android app, **fully rebuilt from scratch** (April 2026). Strict stack as required: Expo SDK 54 + RN New Architecture + TypeScript strict + NativeWind v4 + Reanimated v4 + expo-router v6 + TanStack Query v5 + react-native-sse + @shopify/react-native-skia (NOT victory-native) + AsyncStorage + expo-file-system/document-picker/sharing + expo-haptics + NetInfo. **No framer-motion, no victory-native, no Sobre/Documentação screens.**
   - **5 bottom tabs** (`app/(tabs)/`): `index` (Dashboard), `processar`, `ferramenta`, `historico`, `configuracoes`.
   - **Auth gate** (`app/index.tsx`): Splash → if no `serverUrl` → `/setup`; else if no `user` → `/(auth)/login`; else `/(tabs)`.
   - **Server URL config** (`app/setup.tsx`): persisted via AsyncStorage key `@viax/serverUrl`; `Test connection` calls `/api/healthz` then unlocks Continue.
   - **Session-cookie auth** (`lib/api.ts`): hand-rolled fetch client with `CookieJar` that captures `Set-Cookie` from responses and stores merged jar in AsyncStorage (`@viax/cookies`); attaches `Cookie` header on every request including SSE multipart.
   - **SSE streaming** (`lib/sse.ts`): XHR-based multipart upload → reads response body as event stream and parses `event:` / `data:` blocks; supports cancel + upload progress. Used by Processar and Ferramenta tabs.
   - **Skia charts** (`components/Sparkline.tsx`): `Sparkline`, `BarChart`, `Donut` built with `@shopify/react-native-skia` Path/Canvas — used on Dashboard.
   - **Theme** (`lib/theme.ts`): light/dark tokens from web (`#d4521a` accent, Poppins, 14px radii, hero gradient `#1a0e08 → #2d1408 → #3d1c0c → #1f0a18`); follows OS color scheme.
   - **UI primitives** (`components/ui/`): `Button` (5 variants, haptics), `Input` (label/hint/error/icons), `Card`/`CardHeader`/`StatTile`/`Pill`. Toast via `<ToastProvider>` in `_layout.tsx`.
   - **Logo** (`components/Logo.tsx`): vector SVG port of `<LogoIcon />` (path + 3 circles) using `react-native-svg`.
   - All API calls use the session cookie (web also uses sessions — no JWT). Logout clears cookie jar + cached user.
   - Safe-area handling via `react-native-safe-area-context` `useSafeAreaInsets()` on every screen header and tab bar bottom padding.

## Stack

- **Monorepo tool**: pnpm workspaces (catalog + minimumReleaseAge=1440 supply-chain guard)
- **Node.js version**: 24
- **Package manager**: pnpm 10.26.1 (pinned via `packageManager` field)
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from `lib/api-spec/openapi.yaml`)
- **Frontend**: React 19.1.0 (pinned for Expo compat), Vite 7, TanStack Query, Wouter router, Tailwind CSS v4
- **Mobile**: Expo SDK 54 + React Native 0.81 + expo-router 6 (`artifacts/viax-mobile`)
- **Geocoder microservice**: R 4.5 + Plumber + geocodebr (IPEA/CNEFE) (`artifacts/geocodebr-service`)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Design Tokens

- Light: `--bg: #f4f3ef`, `--accent: #d4521a`, surface with blur(12px)
- Dark: `--bg: #121110`, `--accent: #e8703a`
- Font: Poppins (Google Fonts)
- Border radius: 14px cards, 99px pill buttons

## Installers (root of repo)

- `install.sh` — Linux & macOS (auto-installs Node, pnpm, PostgreSQL, configures DB, builds, creates `start.sh`)
- `install-termux.sh` — Android via Termux (pkg install, pg_ctl setup, creates start/stop scripts)
- `install-geocodebr-termux.sh` — Standalone installer for the **GeocodeR BR** microservice on Termux. Uses `proot-distro` Ubuntu Noble + R 4.5 from CRAN apt repo + **r-universe ARM64 prebuilt binaries** (arrow, duckdb, sf, plumber, geocodebr) — zero C++ compilation, ~10–25 min total
- `install.ps1` — Windows PowerShell (winget/chocolatey, creates `start.bat`)
- `docker-compose.yml` + `Dockerfile.api` + `Dockerfile.web` + `nginx.conf` — Docker full-stack deployment

## GitHub Project Structure

- `.github/ISSUE_TEMPLATE/{bug_report,feature_request}.md` + `config.yml` — issue forms
- `.github/PULL_REQUEST_TEMPLATE.md` — PR template with Conventional Commits checklist
- `.github/dependabot.yml` — weekly npm + monthly github-actions updates, grouped by ecosystem
- `.github/workflows/ci.yml` — CI: typecheck + build + shellcheck on push/PR to main
- `CONTRIBUTING.md` · `CODE_OF_CONDUCT.md` · `SECURITY.md` · `LICENSE` (MIT)
- Banner image: `docs/banner.png` (README) and `artifacts/viax-scout/public/github-banner.png` (Docs page) — both share the same source asset

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Engineering Notes

- `artifacts/viax-scout/vite.config.ts` defaults `PORT=5173` and `BASE_PATH=/` during `vite build` so production builds work in CI without env vars; `vite dev`/`vite preview` still require `PORT` explicitly.
- `artifacts/api-server/src/lib/condo-maps/index.ts` — `cursor` is explicitly typed as `{x:number;y:number}` so the nearest-neighbor loop can hold either `condo.entrada` or a `Quadra` without TS inference clashes.
- Mobile version is the single source of truth in `artifacts/viax-mobile/app.json` (`1.1.0`); `package.json` is kept in sync because the GitHub release tag reads it.
- CI (`.github/workflows/ci.yml`) runs typecheck + builds **both** api-server and viax-scout on every push/PR to `main`.
- Mobile release (`.github/workflows/mobile-release.yml`) requires `EXPO_TOKEN` GitHub secret and is independent of CI.
