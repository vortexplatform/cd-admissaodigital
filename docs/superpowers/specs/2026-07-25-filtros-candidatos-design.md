# Filtros da Lista de Candidatos

## Objetivo

A lista de candidatos deve abrir na situação `Aguardando` e permitir restringir o resultado à filial da requisição vinculada ao candidato.

## Comportamento

- A aba inicial é `Aguardando`; as demais abas, incluindo `Todos`, continuam disponíveis.
- O filtro de filial apresenta as filiais disponíveis com código e nome.
- Ao selecionar uma filial, são retornados apenas candidatos cuja candidatura mais recente esteja vinculada a uma requisição daquela filial.
- Candidatos sem candidatura não aparecem quando houver uma filial selecionada.
- Situação, filial e busca por nome são filtros cumulativos.
- Alterar qualquer filtro reinicia a paginação na primeira página.
- Total da listagem, paginação e contadores por situação refletem os filtros de nome e filial ativos.

## API

- `GET /candidatos` aceitará os parâmetros opcionais `situacao` e `filial`, além de `nome`, `page` e `limit`.
- `GET /candidatos/counts` aceitará os mesmos filtros não paginados.
- A situação é determinada pela candidatura mais recente do candidato, reproduzindo a classificação já exibida na página.
- A filial é comparada com o código da filial da requisição dessa candidatura.
- `GET /candidatos/filiais` retorna os códigos e nomes distintos das filiais presentes nas requisições com candidaturas.

## Interface

- A página mantém as abas de situação e adiciona um seletor pesquisável de filial no cabeçalho da fila.
- A seleção usa os componentes e tokens já empregados nas páginas de processos.
- Enquanto as opções de filial carregam, o campo permanece utilizável com estado de carregamento apropriado.

## Validação

- Cobrir o serviço de candidatos para filtros de situação e filial, inclusive a exclusão de candidatos sem candidatura quando a filial estiver selecionada.
- Verificar que a página abre em `Aguardando`, envia os filtros corretos e retorna à primeira página ao alterá-los.
- Executar os testes da API e as verificações de tipo/lint dos pacotes alterados.
