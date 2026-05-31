# AGENTS.md

## Repo Shape

- pnpm 9 workspace + Turborepo; root scripts fan out with `turbo run ...`.
- `README.md` is still the create-turbo starter and is stale; prefer package scripts, `turbo.json`, and `CLAUDE.md`.
- Apps: `apps/api` is NestJS on port 3001; `apps/web` is Vite + React on port 3000.
- Shared packages: `packages/eslint-config`, `packages/typescript-config`, and an unused starter `packages/ui` package.

## Commands

- Root: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm check-types`, `pnpm format`.
- Focus one app with filters, e.g. `pnpm --filter api dev`, `pnpm --filter web build`, `pnpm --filter api test`.
- API tests: `pnpm --filter api test` runs unit specs under `apps/api/src`; `pnpm --filter api test:e2e` uses `apps/api/test/jest-e2e.json`.
- API Prisma shortcuts exist on the `api` package: `pnpm --filter api db:generate`, `pnpm --filter api db:migrate`, `pnpm --filter api db:studio`.

## Environment And Database

- Root `.env.development` / `.env.production` are loaded by Nest from `apps/api` via `ConfigModule`; Vite also reads env from the repo root via `envDir`.
- Copy root `.env.example` to `.env.development` for app runtime values.
- Prisma CLI reads `apps/api/.env`; keep a local `DATABASE_URL` there even when root env files exist.
- Run raw Prisma commands from `apps/api`, not `apps/api/prisma`; migrations live in `apps/api/prisma/migrations` and `0_baseline` is the consolidated baseline.
- Local `migrate dev` expects the database user to have `CREATEDB` for Prisma's shadow database.
- Production PostgreSQL must apply the candidate search preparation migration before importing 100k+ candidates: enable `unaccent` and `pg_trgm`, create `immutable_unaccent(text)`, and keep the `candidato_nome_trgm_idx` GIN trigram index for fast name lookup.

## API Notes

- Entrypoint: `apps/api/src/main.ts`; global `ValidationPipe({ whitelist: true })` strips unknown DTO fields.
- Auth flow is passwordless OTP: `POST /auth/send-otp`, `POST /auth/verify-otp`, protected `GET /auth/me` with Bearer JWT.
- OTPs are stored in `codeotp`, expire after 10 minutes, and older unused codes for the same identifier are marked used when a new code is generated.
- `AuthModule -> UsersModule -> PrismaModule`; `PrismaModule` is global.
- `User.cpf` and `User.nome` are nullable in Prisma even though business flow treats them as required after first login.

## Web Notes

- Entrypoints: `apps/web/src/main.tsx`, `App.tsx`, `router.tsx`.
- Routing uses React Router v7; `ProtectedRoute` and `PublicRoute` live in `apps/web/src/router.tsx`.
- Auth state lives in `apps/web/src/context/AuthContext.tsx`, stores JWT in `localStorage` as `access_token`, and validates with `GET /auth/me` on load.
- API client is `apps/web/src/lib/api.ts`; it defaults to `http://localhost:3001` and injects the Bearer token with an axios interceptor.
- UI components under `apps/web/src/components/ui` follow shadcn/Radix-style composition; forms use `react-hook-form` + `zod` where present.

## Style And Tooling

- ESLint is shared from `@repo/eslint-config`; app scripts run `eslint . --max-warnings 0`, but the shared base includes `eslint-plugin-only-warn`.
- Prettier config is repo-local: semicolons, single quotes, 2 spaces, trailing commas, print width 100.
- Use `@/` imports only inside `apps/web`; Vite maps it to `apps/web/src`.
