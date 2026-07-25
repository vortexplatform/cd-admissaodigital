# AGENTS.md

## Formato do Repositório

- Workspace pnpm 9 + Turborepo; os scripts da raiz delegam com `turbo run ...`.
- O `README.md` ainda é o starter do create-turbo e está desatualizado; prefira os scripts dos pacotes, o `turbo.json` e o `CLAUDE.md`.
- Apps: `apps/api` é NestJS na porta 5011; `apps/web` é Vite + React na porta 5010.
- Pacotes compartilhados: `packages/eslint-config`, `packages/typescript-config`, um starter `packages/ui` sem uso, e `packages/cloudflared` (túnel de dev via `cloudflared`, token do `.env.development` da raiz).
- `bruno/` contém uma coleção Bruno de HTTP para a API; `docs/codebase-graph.md` é gerado por `pnpm graphify` (rode novamente após mudanças estruturais; partes podem estar defasadas em relação ao código).

## Comandos

- Raiz: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm check-types`, `pnpm format`.
- Foque em um app com filtros, ex.: `pnpm --filter api dev`, `pnpm --filter web build`, `pnpm --filter api test`.
- Testes da API: `pnpm --filter api test` roda os specs unitários em `apps/api/src`; `pnpm --filter api test:e2e` usa `apps/api/test/jest-e2e.json` (arquivos `*.e2e-spec.ts`).
- Atalhos do Prisma existem no pacote `api`: `pnpm --filter api db:generate`, `pnpm --filter api db:migrate`, `pnpm --filter api db:studio`.
- Docker full-stack: `pnpm dev:docker` (compose de dev + túnel cloudflared), `pnpm prod` (compose de prod). O `entrypoint.sh` do container da API roda `prisma migrate deploy` antes de iniciar.

## Ambiente e Banco de Dados

- Os arquivos `.env.development` / `.env.production` da raiz são carregados pelo Nest a partir de `apps/api` via `ConfigModule`; o Vite também lê env da raiz do repo via `envDir`.
- Copie o `.env.example` da raiz para `.env.development` para os valores de runtime.
- O Prisma CLI lê `apps/api/.env`; mantenha um `DATABASE_URL` local lá mesmo quando os arquivos de env da raiz existirem.
- Rode comandos Prisma a partir de `apps/api`, não de `apps/api/prisma`; as migrations ficam em `apps/api/prisma/migrations` e `0_baseline` é a baseline consolidada.
- O `migrate dev` local espera que o usuário do banco tenha `CREATEDB` para o shadow database do Prisma.
- O PostgreSQL de produção deve aplicar a migration de preparação da busca de candidatos antes de importar 100k+ candidatos: habilitar `unaccent` e `pg_trgm`, criar `immutable_unaccent(text)` e manter o índice GIN trigram `candidato_nome_trgm_idx` para busca rápida por nome.
- Integrações opcionais configuradas por env: AWS S3 (armazenamento de documentos), AWS SNS (SMS OTP), Google Cloud Vision (OCR no upload de documentos, via `GOOGLE_APPLICATION_CREDENTIALS_JSON`) e a API Senior (`SENIOR_API_*`) — todas chamadas apenas pela API, nunca pelo app web.

## Notas da API

- Entrypoint: `apps/api/src/main.ts`; o `ValidationPipe({ whitelist: true })` global remove campos desconhecidos dos DTOs.
- A autenticação tem dois caminhos de login, ambos gravando cookies httpOnly (`auth_token` + cookie de refresh, ver `apps/api/src/auth/auth-cookie.ts`):
  - OTP sem senha: `POST /auth/send-otp`, `POST /auth/verify-otp` (agora também aceita `cpf`).
  - Senha: `POST /auth/login` (email + senha).
- Rotação de refresh: `POST /auth/refresh` rotaciona os dois cookies; `POST /auth/logout` limpa ambos. Registros de `RefreshToken` são persistidos no banco.
- A `JwtStrategy` extrai o token do cookie de autenticação primeiro, com fallback para o header `Authorization: Bearer`.
- Máquina-para-máquina: `POST /auth/integrations/token` emite JWTs para credenciais de `IntegrationClient` (usado pela integração Senior); proteja com `IntegrationAuthGuard`.
- OTPs ficam na tabela `codeotp`, expiram em 10 minutos, e códigos antigos não usados do mesmo identificador são marcados como usados quando um novo código é gerado.
- `AuthModule -> UsersModule -> PrismaModule`; o `PrismaModule` é global.
- `User.cpf` e `User.nome` são nullable no Prisma, embora o fluxo de negócio os trate como obrigatórios após o primeiro login.
- Multi-tenant: usuários pertencem a empresas via `EmpresaUsuario`; a maioria das queries de domínio é escopada pela empresa ativa.

## Notas do Web

- Entrypoints: `apps/web/src/main.tsx`, `App.tsx`, `router.tsx`.
- Roteamento com React Router v7; `ProtectedRoute` e `PublicRoute` ficam em `apps/web/src/router.tsx`.
- O estado de autenticação fica em `apps/web/src/context/AuthContext.tsx`. Não há token em `localStorage`: as requisições dependem de cookies httpOnly (`withCredentials: true`) e de `GET /auth/me` no carregamento. A empresa ativa é persistida em um cookie simples `empresa_ativa_id`.
- O cliente de API é `apps/web/src/lib/api.ts` (axios). A base URL é `VITE_API_URL` ou `/api`; em dev o servidor Vite faz proxy de `/api` para `API_PROXY_TARGET` (padrão `http://localhost:5011`), removendo o prefixo. Um interceptor de resposta retenta 401s uma vez após `POST /auth/refresh`.
- Os componentes de UI em `apps/web/src/components/ui` seguem composição estilo shadcn/Radix; formulários usam `react-hook-form` + `zod` onde presentes.
- A fonte de verdade do design é o `DESIGN.md` na raiz do repo (design system Intercom, instalado via `npx getdesign@latest add intercom`). Leia-o antes de qualquer trabalho de UI/estilo em `apps/web` — cores, tipografia, espaçamento e padrões de componentes devem seguir seus tokens.
- Os tokens do DESIGN.md estão mapeados em `apps/web/tailwind.config.ts`: cores (`ink`, `canvas`, `surface-1/2`, `hairline`, `fin`, `report-*`, `inverse-*`), escala tipográfica (`text-display-*`, `text-headline`, `text-body*`, `text-button`, `text-eyebrow`), `rounded-xs/xl/xxl/pill`, `max-w-content`. Prefira esses tokens a valores hex/px crus; os tokens legados de CSS vars (`--primary`, `--card`, ...) ainda existem para componentes estilo shadcn não migrados.

## Estilo e Ferramentas

- O ESLint é compartilhado de `@repo/eslint-config`; os scripts dos apps rodam `eslint . --max-warnings 0`, mas a base compartilhada inclui `eslint-plugin-only-warn`.
- Config do Prettier local ao repo: ponto e vírgula, aspas simples, 2 espaços, trailing commas, print width 100.
- Use imports `@/` apenas dentro de `apps/web`; o Vite mapeia para `apps/web/src`.
