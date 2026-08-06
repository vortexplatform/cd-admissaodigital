# Termo de Vale-Transporte

## Objetivo

Adicionar um documento PDF de impressão chamado `termo-opcao-vale-transporte`, usando os dados da candidatura, da filial vinculada à requisição e da tabela `candidato_vale_transportes`.

## Dados

`candidato_vale_transportes.preco` será renomeado para `tarifa_unitaria` e a tabela receberá `vales_por_dia` como inteiro positivo. DTOs e serviços de cadastro/edição usarão esses nomes. A migration preservará os registros existentes durante o rename.

## Filial

O relatório consultará `GET /admissao/filial?numemp={codigoEmpresaSenior}&codfil={filial}` por meio de `SeniorApiService`. Os dados retornados preencherão razão social, CNPJ e endereço da empregadora. Se a consulta falhar, serão usados os dados locais da empresa e os fallbacks existentes.

## PDF

O relatório exibirá identificação da empregadora e do empregado, incluindo CPF, cargo e endereço residencial. Sem registros de vale-transporte, marcará “NÃO OPTO” e exibirá sempre “Motivo: Admissão”. Com registros, marcará “OPTO” e exibirá uma tabela com trecho, modalidade, empresa/linha, tarifa unitária e vales/dia.

Os totais serão calculados com 22 dias úteis: total diário pela soma de `vales_por_dia`, total mensal pela multiplicação por 22 e valor mensal pela soma de `tarifa_unitaria * vales_por_dia * 22`. O documento incluirá as declarações legais fornecidas, autorização de desconto, compromissos, forma eletrônica e blocos de assinatura existentes.

## Integração

O serviço será registrado no módulo, no dispatcher de templates e em endpoint direto de download autenticado. O código será `termo-opcao-vale-transporte`.

## Validação

Serão executados geração do Prisma Client, lint e verificação de tipos da API. O PDF será validado por geração com dados com e sem vale-transporte, quando houver infraestrutura de testes disponível.
