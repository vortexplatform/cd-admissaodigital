# Cidade da Vaga do Candidato

## Objetivo

Registrar a cidade onde o candidato concorre à vaga e permitir filtrar a lista de candidatos por essa cidade.

## Dados

- Criar a tabela `cidade_vaga` com `id` e `nome` único.
- A migration insere: Governador Valadares, Ipatinga, Coronel Fabriciano, Timóteo, Caratinga, Manhuaçu, Teófilo Otoni e Nanuque.
- `Candidato` recebe a chave estrangeira obrigatória `cidadeVagaId` e a relação para `cidade_vaga`.
- Candidatos existentes precisam receber uma cidade antes de a coluna ser tornada obrigatória; a migration atribui Governador Valadares como valor inicial para preservar os registros atuais.

## API

- `GET /cidades-vaga` retorna as cidades disponíveis, em ordem alfabética.
- Criação e atualização de candidato recebem `cidadeVagaId`; a API exige um identificador de cidade existente.
- `GET /candidatos` e `GET /candidatos/counts` aceitam `cidadeVagaId` como filtro opcional.
- O filtro de cidade é cumulativo com situação, filial e nome, e é aplicado no servidor antes da paginação.

## Interface

- Cadastro e edição exibem o seletor obrigatório "Cidade da vaga" nas informações iniciais do candidato.
- A lista de candidatos ordena seus filtros como: Cidade, Filial e busca por nome.
- As opções dos seletores vêm de `GET /cidades-vaga`.

## Validação

- Testar que a migration cria e semeia as cidades, preservando candidatos existentes.
- Testar validação do vínculo de cidade no cadastro e atualização.
- Testar filtro por cidade combinado com filial, situação e nome.
- Executar migração/geração do Prisma, testes da API, lint, checagem de tipos e build do web.
