# Candidatura Pública

## Objetivo

Disponibilizar um formulário público acessível pelos CTAs de candidatura, pelos cards de vagas e pela seção de inclusão. O formulário consulta o CPF e cria ou atualiza o cadastro do candidato.

## Fluxo

- Rota pública `/candidatar`, sem autenticação.
- Etapa 1: seleção de uma ou mais vagas, resposta obrigatória sobre PCD e pretensão salarial opcional.
- Etapa 2: CPF obrigatório para consulta.
- Etapa 3: candidato existente atualiza e-mail, telefone e, opcionalmente, endereço; candidato novo preenche nome, endereço, cidade da vaga, e-mail, telefone, estado civil, data de nascimento, raça/cor e escolaridade.
- Candidato novo é salvo com situação `CANDIDATO`.
- Experiência profissional permanece indicada como próxima etapa, sem campos nesta entrega.
- Voltar para a etapa anterior preserva os valores preenchidos.
- Ao finalizar a etapa 3, salvar e exibir confirmação.

## Interface

Usar os componentes existentes de formulário e os tokens do `DESIGN.md`. A lista de vagas será apresentada como checkboxes para permitir múltipla seleção. PCD será um grupo de radios com as opções Sim e Não. A página será responsiva, com ações de navegação acessíveis e mensagens de validação junto aos campos.

## API Pública

- `POST /public/candidatos/consultar` consulta o CPF e retorna somente os campos necessários ao formulário.
- `POST /public/candidatos` cria um candidato novo com situação `CANDIDATO`.
- `POST /public/candidatos/atualizar` altera somente contatos e, quando solicitado, endereço.
- `GET /public/candidatos/opcoes` fornece cidades da vaga, estados civis e raça/cor.

## Perfil Profissional

- `candidato_dados_vaga` mantém uma relação 1:1 com o candidato, identificada por `id_candidato` como chave única.
- `candidato_loja_proxima` guarda uma ou mais filiais próximas, identificadas por `id_candidato` e `codfil`.
- `candidato_experiencia` guarda múltiplas experiências; o campo `id` é sequencial dentro de cada candidato.
- A etapa de perfil profissional permite informar dados de disponibilidade, indicação, parentesco, aposentadoria e condução, selecionar filiais próximas e adicionar ou remover experiências.
- Os dados do perfil profissional são atualizáveis tanto para cadastros novos quanto para candidatos já existentes.

## Escopo Técnico

- Criar uma página React pública usando `react-hook-form`.
- Redirecionar todos os pontos de entrada de candidatura para `/candidatar`.
- Aceitar a vaga do card via `location.state` e deixá-la pré-selecionada.
- Não alterar o modelo Prisma; reutilizar o cadastro existente.
- Validar com `pnpm --filter web check-types`, `pnpm --filter api check-types` e os lintes dos arquivos alterados.
