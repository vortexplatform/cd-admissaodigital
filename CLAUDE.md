# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo

Turborepo + pnpm workspaces com dois apps e dois packages compartilhados:

- `apps/api` — NestJS (porta 3001)
- `apps/web` — Vite + React (porta 3000)
- `packages/eslint-config` — configs ESLint compartilhadas
- `packages/typescript-config` — configs TypeScript compartilhadas

## Comandos

```bash
# Raiz — roda os dois apps em paralelo via Turbo
pnpm dev

# Build, lint e type-check de tudo
pnpm build
pnpm lint
pnpm check-types

# Apenas a API
pnpm --filter api dev
pnpm --filter api test
pnpm --filter api test:e2e

# Banco de dados (rodar a partir de apps/api)
npx prisma migrate dev --name nome-da-mudanca   # nova migration
npx prisma migrate reset --force                 # recria o banco do zero (dev only)
npx prisma studio                                # GUI do banco
npx prisma generate                              # regenera o Prisma Client
```

## Variáveis de ambiente

Os arquivos `.env.development` e `.env.production` ficam na **raiz** do monorepo e são carregados pelo NestJS via `ConfigModule` (que resolve o path relativo a partir de `apps/api`). O Prisma CLI lê o `apps/api/.env` (gitignored) — esse arquivo deve conter apenas o `DATABASE_URL` apontando para o banco local.

Copie `.env.example` para `.env.development` na raiz e crie `apps/api/.env` com a `DATABASE_URL` para o ambiente de desenvolvimento.

## Arquitetura da API (NestJS)

Fluxo de autenticação passwordless via OTP:

1. `POST /auth/send-otp` — recebe email ou telefone, gera código de 6 dígitos (TTL 10 min), envia por Nodemailer (email) ou AWS SNS (SMS)
2. `POST /auth/verify-otp` — valida o código, faz `findOrCreate` do usuário, retorna JWT (7 dias)
3. Rotas protegidas usam `JwtAuthGuard` (Passport Bearer)

O `identifier` (email ou telefone) é armazenado na tabela `codeotp` e vinculado ao campo correspondente em `users`. O `JwtStrategy` valida o token e carrega o usuário do banco a cada requisição.

Estrutura de módulos: `AuthModule` → `UsersModule` → `PrismaModule`. O `PrismaModule` é global.

## Schema do banco

Tabelas principais e suas relações:

- **users** — usuário autenticado; `role` enum (`CANDIDATO`, `RH`, `ADMIN`); `cpf` e `nome` são obrigatórios após o primeiro login (validação na camada de negócio, não no banco)
- **candidato** — perfil do candidato; pode existir sem vínculo com `users` (`userId` nullable); tem relação 1-para-1 com `users`
- **requisicao_vaga** — requisição de abertura de vaga; referencia `candidato`, `criadoPor` (User) e `aprovadoPor` (User) todos nullable; status controlado pelo enum `StatusRequisicaoVaga`
- **codeotp** — códigos OTP descartáveis; marcados como `used = true` após verificação ou ao gerar novo código para o mesmo identifier

## Migrations

O usuário `admissao_dev` tem permissão `CREATEDB` (necessário para o shadow database do `migrate dev`). Sempre executar os comandos Prisma a partir de `apps/api`, nunca de `apps/api/prisma`.

O migration `0_baseline` representa o estado consolidado inicial do banco. Novas migrations são geradas normalmente com `migrate dev`.

## Frontend (Vite + React)

- Roteamento com React Router v7; rotas protegidas via `ProtectedRoute` / `PublicRoute` em `src/router.tsx`
- Estado de autenticação global em `src/context/AuthContext.tsx` — persiste JWT em `localStorage`, valida via `GET /auth/me` no carregamento
- Cliente HTTP em `src/lib/api.ts` (axios) — injeta o Bearer token automaticamente via interceptor
- Componentes UI em `src/components/ui/` seguem o padrão shadcn/ui (Radix + Tailwind)
- Formulários com `react-hook-form` + `zod`
