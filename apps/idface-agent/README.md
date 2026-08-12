# Agente iDFace

Ponte local entre a API de admissao digital e um iDFace Control iD. Deve rodar em um PC na mesma rede do equipamento; a comunicacao com a API e feita por HTTPS, sem expor o iDFace para a internet.

## Pre-requisitos

- Node.js 18 ou superior.
- O PC deve alcançar a API de producao, a API Senior e todos os iDFaces retornados pela Senior.
- Um dispositivo biometrico criado em `Configuracoes > Biometria`; copie o token `bio_...` exibido uma unica vez.
- O sistema externo que sincroniza o iDFace deve criar o candidato com `id` igual ao CPF, apenas digitos, e uma face cadastrada. Zeros à esquerda são aceitos na comparação.

## Configuracao

1. Copie `.env.example` para `.env` neste diretorio.
2. Preencha `API_BASE_URL`, `BIOMETRIA_DEVICE_TOKEN` e `SENIOR_API_URL`.
3. O agente consulta `GET /controlid-idface/dispositivos?modrlg=17` para descobrir todos os IPs dos equipamentos.
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
2. O RH solicita a assinatura biometrica. O agente consulta a Senior e observa novos `access_logs` de todos os iDFaces retornados para `modrlg=17`.
3. Ao identificar o CPF esperado com confianca suficiente, o agente envia o resultado para a API. A API assina e certifica os documentos existentes.

O agente usa `access_logs.id` como marca d'agua, portanto ignora identificacoes ocorridas antes da solicitacao. Por padrao, uma identificacao de CPF diferente reprova a solicitacao; use `REJECT_ON_MISMATCH=false` para ignorar pessoas que passarem pelo equipamento enquanto a verificacao estiver aberta.
