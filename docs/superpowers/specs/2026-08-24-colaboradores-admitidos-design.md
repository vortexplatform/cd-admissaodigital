# Relatório de colaboradores admitidos

## Objetivo

Adicionar uma seção `Relatórios` à sidebar, abaixo de `Assinaturas`, com uma
página de catálogo preparada para vários relatórios. O primeiro card será
`Candidatos admitidos`, acessível a usuários autenticados de RH (`RH` e
`ADMIN`), com resumo das candidaturas efetivadas e acesso à listagem completa.

## Interface

- Catálogo: `/relatorios`.
- Card: `Candidatos admitidos`, funcionando como um atalho para o relatório
  detalhado, sem carregar dados na página de catálogo.
- Detalhe: `/relatorios/candidatos-admitidos`.
- Filtro por data inicial e final de admissão no detalhe, com padrão nos últimos
  30 dias.
- Cards de resumo para total no período e total no mês atual no detalhe.
- Tabela com nome, CPF, empresa, filial, cargo, data de admissão e matrícula.
- Estados de carregamento, erro e lista vazia usando os componentes existentes.

## API

O dashboard receberá um endpoint autenticado que consulta `Candidatura` com
status `EFETIVADO` e data `admissao` dentro do período solicitado. A resposta
terá resumo e registros paginados. Não haverá alteração no schema Prisma.

## Acesso e validação

O relatório ficará dentro de `ProtectedRoute`, mas fora de `AdminRoute`, para
que RH e ADMIN possam acessá-lo. Datas serão aceitas em `YYYY-MM-DD` e a
paginação será processada no backend.

## Verificação

Executar testes da API, build do web e checagem de tipos após a implementação.
