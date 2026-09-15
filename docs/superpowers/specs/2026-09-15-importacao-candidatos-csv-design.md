# Importação de candidatos via CSV

## Contexto

É necessário importar mais de 36 mil registros cadastrais provenientes de outro
sistema para a tabela `candidato`. O arquivo contém somente dados cadastrais e
possui `NOMCAN` (nome civil) e `NOMSOC` (nome social).
Todos os registros receberão `cidadeVagaId = 1`. A importação não deve criar
usuários, candidaturas, documentos ou etapas.

## Objetivos

- Importar o maior volume possível com segurança e desempenho.
- Preservar integralmente candidatos cujo CPF já exista.
- Identificar e separar registros inválidos sem perder o lote inteiro.
- Permitir validação prévia e reprocessamento controlado.
- Produzir relatório auditável da execução.

## Abordagem

Será criado um script CLI offline em `apps/api/scripts/importar-candidatos.ts`.
O script fará leitura em streaming do CSV e carregará os dados em uma tabela de
staging temporária do PostgreSQL. A inserção final será feita diretamente no
PostgreSQL, sem passar por endpoints HTTP ou pelo fluxo normal de criação da
API.

Exemplo de execução:

```bash
pnpm --filter api import:candidatos --arquivo ./candidatos.csv --cidade-vaga-id 1
```

O valor padrão de `cidade-vaga-id` será `1`, mas poderá ser informado
explicitamente para evitar execução acidental com outra configuração.

## Fluxo de dados

1. Verificar existência do arquivo, cabeçalho esperado e conexão com o banco.
2. Verificar que `cidade_vaga.id = 1` existe.
3. Ler o CSV em streaming, mantendo o número da linha original.
4. Normalizar os valores de entrada.
5. Validar cada registro e separar válidos de inválidos.
6. Detectar CPFs duplicados dentro do próprio arquivo.
7. Carregar registros válidos no staging.
8. Inserir em `candidato` com `ON CONFLICT (cpf) DO NOTHING`.
9. Emitir relatório final e arquivo CSV de erros.

## Regras de negócio

- CPF será armazenado como texto com somente dígitos e preservação de zeros à
  esquerda.
- `NOMCAN` será gravado em `nome` e `NOMSOC` em `nomeSocial`, limitado a 70
  caracteres.
- CPF já existente em `candidato` será ignorado; nenhum campo existente será
  atualizado.
- CPF repetido no CSV será importado no máximo uma vez e as demais ocorrências
  serão reportadas.
- `dataNascimento` é obrigatório e deve ser uma data válida.
- `cidadeVagaId` será fixado em `1` e deve satisfazer a chave estrangeira.
- A coluna `id` não será informada no `INSERT`; o banco a gerará
  automaticamente por `autoincrement()`.
- `userId` permanecerá nulo, salvo necessidade explícita futura de criação de
  acesso.
- Campos não presentes ou não necessários no CSV usarão os defaults definidos
  no banco ou permanecerão nulos.
- Nenhuma chamada externa, envio de OTP ou criação de documento será realizada.

## Validação e erros

Serão rejeitados registros com cabeçalho incompatível, CPF ausente ou inválido,
data inválida, valor incompatível com o tipo do banco ou texto acima do limite
da coluna. O relatório de erros conterá ao menos número da linha, CPF quando
disponível e motivo da rejeição.

O modo `--dry-run` executará leitura e validação sem inserir dados. A operação
efetiva terá transação para a inserção final; falhas inesperadas deverão causar
rollback da etapa de persistência.

## Operação

- Fazer backup antes da execução em produção.
- Testar primeiro em homologação com 100 linhas.
- Executar validação completa com `--dry-run`.
- Conferir totais e amostra dos dados normalizados.
- Executar a carga efetiva.
- Comparar totais inseridos e ignorados com os relatórios.
- Reprocessar somente linhas corrigidas, sem alterar candidatos existentes.

## Critérios de aceite

- O script processa 36 mil ou mais linhas sem carregar o arquivo inteiro em
  memória.
- Nenhum CPF existente é sobrescrito.
- Registros inválidos são reportados individualmente.
- A execução é repetível sem duplicar candidatos.
- O vínculo de todos os novos candidatos aponta para `cidade_vaga.id = 1`.
- O relatório informa linhas lidas, válidas, inseridas, ignoradas e rejeitadas.
- Testes cobrem normalização de CPF, datas, duplicidade e comportamento de
  conflito.
