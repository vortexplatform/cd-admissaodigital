---
description: Analisa o codebase e gera um grafo de estrutura e dependências (Markdown + Mermaid).
---

Analise o diretório `$ARGUMENTS` (se estiver vazio, use `.`, a raiz do workspace) e gere um **grafo do codebase** em Markdown com diagramas Mermaid.

## O que mapear

1. **Workspace**: pacotes/apps do monorepo (leia `pnpm-workspace.yaml`, `turbo.json` e os `package.json` de cada pacote) e as dependências entre eles (`workspace:*`).
2. **Apps**: para cada app, mapeie os módulos principais e suas relações:
   - `apps/api` (NestJS): módulos, controllers, services e providers — derive dos decorators `@Module({ imports, controllers, providers })`.
   - `apps/web` (React): rotas/páginas, contextos, componentes principais e cliente de API.
3. **Infra**: banco de dados (schema Prisma), serviços externos (S3, SNS, e-mail) e variáveis de ambiente relevantes.

## Saída

- Escreva o resultado em `docs/codebase-graph.md` (crie a pasta `docs/` se não existir).
- Estrutura do arquivo:
  - Título e data de geração.
  - `## Visão geral do workspace` com um `graph LR` Mermaid das dependências entre pacotes.
  - Uma seção por app com `graph TD` Mermaid dos módulos e relações.
  - `## Entidades de dados` com um `erDiagram` Mermaid resumido a partir do schema Prisma.
  - `## Serviços externos` listando integrações (S3, SNS, SMTP, etc.).
- Use nomes reais extraídos do código; não invente módulos.
- Seja conciso: o grafo é um mapa de navegação, não documentação exaustiva.

## Flags

- `--watch`: **não** tente observar arquivos você mesmo. O modo contínuo é determinístico e roda em um terminal separado com `pnpm graphify -- --watch` (ou `node scripts/graphify.mjs <dir> --watch`). Se o usuário passar `--watch`, apenas gere o grafo uma vez e informe como ativar o watch.

## Regras

- Ignore `node_modules`, `dist`, `build`, `.turbo` e arquivos gerados (ex.: client Prisma).
- Prefira `glob`/`grep`/`read` para inspecionar o código; não execute builds nem testes.
- Ao final, resuma em 3-5 linhas o que foi mapeado e onde o arquivo foi salvo.
