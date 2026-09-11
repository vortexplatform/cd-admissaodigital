# Assinatura Presencial em Tablet

## Objetivo

Substituir a assinatura por biometria iDFace pela assinatura presencial manuscrita em tablet. O RH inicia o processo em uma nova aba autenticada; o candidato, ou o responsavel legal quando aplicavel, le e assina cada documento com caneta. Ao final, uma foto do signatario e capturada e incorporada em cada PDF assinado.

## Escopo

- Substituir os botoes de biometria nos envelopes por `Iniciar assinatura presencial`.
- Abrir uma rota protegida para o RH, em nova aba, para cada envelope.
- Permitir assinatura manuscrita individual por documento em local escolhido pelo signatario no PDF.
- Capturar uma foto unica ao fim da sessao e inclui-la em todos os PDFs daquele signatario.
- Atender candidatos e responsaveis legais de candidatos menores de idade.
- Manter o fluxo remoto por OTP sem alteracoes.
- Remover o iDFace do fluxo de assinatura, sem alterar sua configuracao ou outros usos.

## Arquitetura

### Sessao presencial

Criar uma sessao presencial por envelope e signatario. A sessao registra envelope, candidatura, tipo de signatario, RH que a iniciou, status, inicio, conclusao, expiracao, IP, navegador e caminho da foto no S3.

Somente RH ou administrador autenticado pode criar, consultar e concluir a sessao. A rota do tablet usa a mesma autenticacao por cookie do RH e valida o acesso ao envelope. Uma sessao pendente pode ser retomada ate expirar; um envelope concluido nao pode iniciar nova sessao.

### Evidencias por documento

Criar registros temporarios para cada assinatura manuscrita. Cada registro guarda documento, sessao, imagem PNG do traco no S3, pagina e coordenadas normalizadas da area escolhida no PDF. A normalizacao permite converter o ponto independentemente do tamanho em que o PDF foi exibido no tablet.

As evidencias sao imutaveis apos a conclusao. O banco armazena metadados e caminhos de armazenamento, nunca imagens em base64.

### Finalizacao

A finalizacao exige que todos os documentos pendentes tenham uma evidencia de assinatura e que a foto do signatario tenha sido capturada. Em uma operacao idempotente, a API:

1. Valida sessao, autorizacao, foto e evidencias de todos os documentos.
2. Baixa o PDF original e insere a assinatura na pagina e posicao indicadas.
3. Insere a foto do signatario em cada PDF e no comprovante de auditoria.
4. Calcula hash, atualiza o documento como assinado pelo metodo presencial e registra eventos de auditoria.
5. Conclui o envelope e mantem a certificacao A1 e notificacoes ja existentes.

Uma falha antes da conclusao nao marca documentos como assinados, permitindo retomar a sessao sem perda de evidencias.

## Fluxo de Interface

1. RH clica em `Iniciar assinatura presencial` e abre `/assinaturas/presencial/:envelopeId` em nova aba.
2. A tela apresenta o signatario, o setor e o progresso.
3. Cada PDF e renderizado em tela cheia. O signatario toca no local desejado e desenha a assinatura com caneta; pode limpar e refazer antes de confirmar.
4. O documento confirmado fica concluido na sessao e o proximo documento e liberado.
5. Ao concluir todos os documentos, a camera frontal captura uma unica foto do signatario.
6. A confirmacao final envia as evidencias e apresenta o resultado da conclusao.
7. Para menores, o candidato conclui primeiro; em seguida, o responsavel legal usa o mesmo fluxo e sua propria foto e assinatura.

## Auditoria e Seguranca

- Adicionar `PRESENCIAL` ao metodo de assinatura e eventos especificos para inicio de sessao, assinatura de documento, foto capturada e sessao concluida.
- Registrar RH operador, data/hora, IP e navegador, alem dos hashes do PDF final.
- Validar MIME, tamanho e dimensoes das imagens de assinatura e foto antes de armazena-las.
- Rejeitar documento fora do envelope, assinatura sem traco ou coordenada, sessao expirada, foto ausente e tentativa de alterar evidencias concluidas.
- Desabilitar acoes duplicadas no cliente e tratar a finalizacao de modo idempotente no servidor.

## Compatibilidade

- A assinatura por OTP continua disponivel para o portal remoto e nao e modificada.
- Os fluxos e dispositivos do iDFace permanecem no repositorio, mas nao sao acionados pelos novos botoes de assinatura presencial.
- Os PDFs finais continuam sendo certificados com A1 e disponibilizados pelos endpoints existentes.

## Testes

- Unitarios para autorizacao, criacao e retomada de sessao, validacao de imagens, conversao de coordenadas e finalizacao idempotente.
- Unitarios para candidato e responsavel legal, incluindo foto distinta para cada signatario.
- Integracao para criar sessao, salvar evidencias, capturar foto, concluir e recuperar o PDF final.
- Verificacao de que a assinatura e a foto aparecem no PDF final e que o metodo e exibido como presencial na auditoria.
