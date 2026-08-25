# HusStand Hub

HusStand Hub er en tablet-vennlig, lokal-først hjem-administrasjonsapp for ukemeny, oppskrifter og familiens hverdagslogistikk.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run generate` — generer Drizzle-migrasjon som ved behov kan brukes utenfor Replit
- Valgfri env: `HUSSTAND_DB_PATH` — sti til lokal SQLite-fil (standard: `data/husstand-hub.db`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: SQLite-fil + Drizzle ORM-skjema
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/husstand-hub/` — React- og Tailwind-grensesnittet, med dashboard, middagsplan og oppskrifter
- `artifacts/api-server/src/routes/` — Express-ruter for dashboard, middagsplan og oppskrifter
- `lib/api-spec/openapi.yaml` — kilde til det delte API-et og genererte klienthooks
- `lib/db/src/schema/` — Drizzle-skjema for nåværende og framtidige moduler
- `lib/db/src/initialize.ts` — idempotent SQLite-oppsett og velkomstdata

## Architecture decisions

- SQLite er plassert bak en Drizzle SQLite-proxy med Node sin innebygde SQLite-driver, slik at appen ikke krever en ekstern database når den flyttes til en Raspberry Pi.
- API-kontrakten ligger i OpenAPI og brukes til å generere både servervalidering og React Query-hooks.
- Databasen oppretter tabeller og eksempeldata automatisk bare når den er tom; brukerens påfølgende data beholdes.

## Product

- Veggtilpasset dashboard med dagens middag, ukesmeny, handlelisteoversikt og barnehagestatus
- Full CRUD for middagsplan og oppskrifter
- Forberedt datamodell for dynamiske handlelister, husprosjekter, barnehage/utstyr og pakkelister

## User preferences

- Norsk grensesnitt, store berøringsflater og tydelig kontrast for nettbrett på veggen

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
