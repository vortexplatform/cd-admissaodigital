# Agente iDFace

Ponte local entre a API de admissao digital e um iDFace Control iD. Deve rodar em um PC na mesma rede do equipamento; a comunicacao com a API e feita por HTTPS, sem expor o iDFace para a internet.

## Pre-requisitos

- Node.js 18 ou superior.
- O PC deve alcançar a API de producao, a API Senior e todos os iDFaces retornados pela Senior.
- O sistema externo que sincroniza o iDFace deve criar o candidato com `id` igual ao CPF, apenas digitos, e uma face cadastrada. Zeros à esquerda são aceitos na comparação.

## Configuracao

1. Copie `.env.example` para `.env` neste diretorio.
2. Preencha `API_BASE_URL`, `SENIOR_API_URL` e `IDFACE_IP`.
3. O agente consulta a Senior para descobrir os iDFaces disponíveis e usa o equipamento selecionado pelo RH.
4. Troque `IDFACE_LOGIN` e `IDFACE_PASSWORD` pelas credenciais do equipamento. Nao use `admin/admin` em producao.

## Execucao

```bash
pnpm --filter idface-agent dev
```

Para producao, compile e execute o processo como servico do sistema:

```bash
pnpm --filter idface-agent build
pnpm --filter idface-agent start
```

## Fluxo

1. O sistema externo cadastra e mantem a face do candidato no iDFace.
2. O RH seleciona o iDFace e solicita a assinatura biométrica. O agente consulta os `access_logs` desse equipamento.
3. Ao identificar o CPF esperado com confianca suficiente, o agente envia o resultado para a API. A API assina e certifica os documentos existentes.

O agente usa `access_logs.id` como marca d'agua, portanto ignora identificacoes ocorridas antes da solicitacao. Por padrao, uma identificacao de CPF diferente reprova a solicitacao; use `REJECT_ON_MISMATCH=false` para ignorar pessoas que passarem pelo equipamento enquanto a verificacao estiver aberta.
