---
version: alpha
name: Intercom-design-analysis
description: "Uma canvas editorial de marketing de atendimento ao cliente construída sobre um fundo creme-branco suave, tipografia carvão em Saans (a sans geométrica proprietária da Intercom) e um único e confiante Fin Orange (#ff5600) reservado para a marca Fin AI. Os cards vivem como tiles brancos flutuantes com bordas hairline finas e raios mínimos (8–16px). Headlines de display usam Saans em peso 500 com tracking negativo medido. O sistema se lê como uma publicação cuidadosa e product-led: screenshots de produto dominam, ornamento é raro, e o único lugar onde entra energia cromática é o CTA em Fin Orange."

colors:
  primary: "#111111"
  on-primary: "#ffffff"
  ink: "#111111"
  ink-muted: "#626260"
  ink-subtle: "#7b7b78"
  ink-tertiary: "#9c9fa5"
  canvas: "#f5f1ec"
  surface-1: "#ffffff"
  surface-2: "#ebe7e1"
  inverse-canvas: "#000000"
  inverse-surface-1: "#313130"
  inverse-ink: "#ffffff"
  inverse-ink-muted: "#9c9fa5"
  hairline: "#d3cec6"
  hairline-soft: "#ebe7e1"
  fin-orange: "#ff5600"
  report-orange: "#fe4c02"
  report-blue: "#65b5ff"
  report-green: "#0bdf50"
  report-pink: "#ff2067"
  report-lime: "#b3e01c"
  report-cyan: "#03b2cb"
  brand-blue: "#0007cb"
  semantic-error: "#c41c1c"
  semantic-success: "#0bdf50"

typography:
  display-xl:
    fontFamily: Saans
    fontSize: 72px
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: -2.0px
  display-lg:
    fontFamily: Saans
    fontSize: 56px
    fontWeight: 500
    lineHeight: 1.10
    letterSpacing: -1.4px
  display-md:
    fontFamily: Saans
    fontSize: 40px
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: -0.8px
  headline:
    fontFamily: Saans
    fontSize: 28px
    fontWeight: 500
    lineHeight: 1.20
    letterSpacing: -0.5px
  card-title:
    fontFamily: Saans
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: -0.3px
  subhead:
    fontFamily: Saans
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.40
    letterSpacing: -0.2px
  body-lg:
    fontFamily: Saans
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: -0.1px
  body:
    fontFamily: Saans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0
  body-sm:
    fontFamily: Saans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0
  caption:
    fontFamily: Saans
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.40
    letterSpacing: 0
  button:
    fontFamily: Saans
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.20
    letterSpacing: 0
  eyebrow:
    fontFamily: Saans
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.30
    letterSpacing: 0
  mono:
    fontFamily: SaansMono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 24px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px

components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 18px
  button-primary-pressed:
    backgroundColor: "{colors.inverse-canvas}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 18px
  button-tertiary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 18px
  button-fin:
    backgroundColor: "{colors.fin-orange}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 18px
  pricing-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 24px
  pricing-card-featured:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 24px
  feature-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 24px
  product-mockup-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: 24px
  testimonial-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.lg}"
    padding: 32px
  customer-logo-tile:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: 16px
  text-input:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 10px 14px
  text-input-focused:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 10px 14px
  pricing-tab-default:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 8px 16px
  pricing-tab-selected:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 8px 16px
  faq-row:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 24px
  cta-banner:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.lg}"
    padding: 48px
  startup-discount-card:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 32px
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xs}"
    height: 56px
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: 64px 32px
---

## Visão Geral

A canvas de marketing da Intercom é um fundo creme-branco suave (`{colors.canvas}` ≈ #f5f1ec) — não branco puro. O aconchego é o sinal da marca: é editorial, calmo e focado em produto, não um SaaS brilhante. Sobre a canvas creme repousam cards brancos flutuantes (`{colors.surface-1}`), divisores hairline finos (`{colors.hairline}`) e tipografia carvão (`{colors.ink}` #111111).

O tipo de display é **Saans** — a sans geométrica proprietária da Intercom — em peso 500 com letter-spacing negativo medido (-2.0px no display de 72px). O texto de corpo usa a mesma família em peso 400. O único mono proprietário é o **SaansMono**, usado com parcimônia em trechos de código e screenshots da UI do produto embutidos na superfície de marketing.

O único acento cromático é o **Fin Orange** (`{colors.fin-orange}` #ff5600) — a cor da marca do produto de IA da Intercom. Ele aparece no CTA do produto Fin, no badge Fin da página de preços e em alguns momentos de ênfase inline. Ele NÃO é um primário de sistema; o primário do sistema é o carvão `{colors.ink}`. A Intercom também mantém uma pequena **paleta de relatórios** (`{colors.report-blue}`, `{colors.report-green}`, `{colors.report-pink}`, `{colors.report-lime}`) usada dentro das superfícies de analytics do produto mostradas nos mockups.

O ritmo da página é dominado por **mockups de produto**: o conteúdo de cada seção é um screenshot de alta fidelidade da UI da Intercom, enquadrado em cards brancos com cantos `{rounded.xl}` de 16px. O chrome de marketing é intencionalmente silencioso para que o produto seja o protagonista.

**Características-Chave:**
- **Canvas creme** (`{colors.canvas}` #f5f1ec) é a superfície que define a marca — nem branca nem cinza, deliberadamente quente.
- Ritmo de página guiado por screenshots de produto: cada seção centraliza um card de mockup de produto, o chrome de marketing fica mínimo.
- **Saans**, a sans-serif proprietária, carrega toda a hierarquia; SaansMono apenas para contextos de código.
- **Carvão** `{colors.ink}` (#111111) é o primário do sistema — botões, headlines e texto de corpo ficam sobre carvão.
- **Fin Orange** (`{colors.fin-orange}` #ff5600) é a cor do produto de IA — usada no CTA Fin e no badge Fin, nunca decorativamente.
- O tracking de display vai agressivamente para o negativo (-2.0px em 72px); o corpo fica em 0.
- Os cantos dos cards ficam modestos em `{rounded.lg}` 12px e `{rounded.xl}` 16px — nunca pill; nunca quadrados.

## Cores

> Páginas de origem: intercom.com (home), /pricing, /helpdesk, /customers, /helpdesk/inbox.

### Marca e Acento
- **Charcoal** ({colors.ink}): A superfície primária do sistema. Headlines, texto de corpo, fundo do CTA primário — tudo carvão.
- **Branco** ({colors.on-primary}): Texto sobre CTAs carvão; canvas dos cards flutuantes.
- **Fin Orange** ({colors.fin-orange}): O acento do produto de IA. Usado no CTA Fin, no badge Fin e em um pequeno conjunto de momentos de ênfase inline.
- **Report Orange** ({colors.report-orange}): Um laranja levemente diferente usado dentro da paleta de relatórios/analytics para mockups do produto.
- **Brand Blue** ({colors.brand-blue}): Azul de marca saturado (#0007cb) — usado em um pequeno conjunto de ilustrações de marketing.

### Superfície
- **Canvas** ({colors.canvas}): Fundo padrão da página — creme-branco suave #f5f1ec.
- **Surface 1** ({colors.surface-1}): Branco puro — usado nos cards flutuantes (pricing, feature, mockup de produto).
- **Surface 2** ({colors.surface-2}): Creme levemente mais escuro — banner de desconto para startups, listras de linhas alternadas.
- **Hairline** ({colors.hairline}): Bordas de 1px nos cards — cinza quente suave (#d3cec6).
- **Hairline Soft** ({colors.hairline-soft}): Divisores ainda mais suaves entre linhas de FAQ e colunas do footer.
- **Inverse Canvas** ({colors.inverse-canvas}): Preto puro — apenas na faixa de depoimento/citação.
- **Inverse Surface 1** ({colors.inverse-surface-1}): Um degrau mais claro — itens de footer com hover em contextos escuros.

### Texto
- **Ink** ({colors.ink}): Todas as headlines, texto de corpo, rótulos de botão — carvão #111111.
- **Ink Muted** ({colors.ink-muted}): Tipografia secundária em #626260 — meta informação, tabs de pricing deselecionadas.
- **Ink Subtle** ({colors.ink-subtle}): Tipografia terciária em #7b7b78 — colunas do footer, texto auxiliar.
- **Ink Tertiary** ({colors.ink-tertiary}): Tipografia quaternária em #9c9fa5 — desabilitado, notas de rodapé.
- **Inverse Ink** ({colors.inverse-ink}): Branco sobre preto — texto da faixa de citação.
- **Inverse Ink Muted** ({colors.inverse-ink-muted}): Cinza claro sobre preto — meta da faixa de citação.

### Paleta Semântica e de Relatórios (mockups do produto)
- **Error Red** ({colors.semantic-error}): Validação de formulário, estados destrutivos.
- **Success Green** ({colors.semantic-success}): Estados positivos (também `{colors.report-green}`).
- **Report Blue** ({colors.report-blue}): Azul de gráficos de analytics.
- **Report Pink** ({colors.report-pink}): Rosa de gráficos de analytics.
- **Report Lime** ({colors.report-lime}): Lima de gráficos de analytics.
- **Report Cyan** ({colors.report-cyan}): Acento do seletor de país de telefone.

A paleta de relatórios aparece DENTRO dos mockups da UI do produto — são as cores de gráficos do produto da Intercom, não cores da superfície de marketing.

## Tipografia

### Família Tipográfica

- **Saans** — sans geométrica proprietária da Intercom, fallback `Saans Fallback, ui-sans-serif, system-ui`. Carrega display, corpo, eyebrow e botão.
- **SaansMono** — Mono proprietário, fallback `SaansMono Fallback, ui-monospace`. Usado dentro de trechos de código mostrados nos mockups de produto.

A mesma família carrega toda a hierarquia. A hierarquia é construída por tamanho + peso + tracking, não por mudança de família.

### Hierarquia

| Token | Tamanho | Peso | Line Height | Letter Spacing | Uso |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 72px | 500 | 1.05 | -2.0px | Maior headline de hero |
| `{typography.display-lg}` | 56px | 500 | 1.10 | -1.4px | Headlines de abertura de seção |
| `{typography.display-md}` | 40px | 500 | 1.15 | -0.8px | Headlines de subseção |
| `{typography.headline}` | 28px | 500 | 1.20 | -0.5px | Títulos de tier de pricing, banner CTA |
| `{typography.card-title}` | 22px | 500 | 1.25 | -0.3px | Título de card, feature card |
| `{typography.subhead}` | 20px | 400 | 1.40 | -0.2px | Corpo de abertura, parágrafos de introdução |
| `{typography.body-lg}` | 18px | 400 | 1.50 | -0.1px | Subhead de hero, parágrafos de destaque |
| `{typography.body}` | 16px | 400 | 1.50 | 0 | Corpo padrão |
| `{typography.body-sm}` | 14px | 400 | 1.50 | 0 | Corpo de card, footer |
| `{typography.caption}` | 12px | 400 | 1.40 | 0 | Legendas, meta |
| `{typography.button}` | 15px | 500 | 1.20 | 0 | Rótulos de botão pill/quadrado |
| `{typography.eyebrow}` | 14px | 500 | 1.30 | 0 | Eyebrow de seção (sentence case) |
| `{typography.mono}` | 13px | 400 | 1.50 | 0 | SaansMono para código em mockups |

### Princípios

- **O peso 500 carrega o display.** Saans em 500 lê confiante sem bold.
- **O letter-spacing negativo escala com o tamanho.** -2.0px em 72px (≈3% do tamanho), descendo até 0 no corpo.
- **Os line-heights apertam no display e relaxam no corpo.** 1.05 no display-xl, 1.50 no body.
- **Nada de mono no chrome.** SaansMono vive na UI do produto; o chrome de marketing fica em Saans.
- **Eyebrow usa sentence case** em 14px / peso 500 — sem all-caps com tracking.

### Nota sobre Fontes Substitutas

Se for implementar sem Saans, substitutas adequadas incluem **Söhne** (paga), **Inter** (gratuita, peso 500) ou **Geist Sans** (gratuita). Inter em peso 500 é a substituta gratuita mais próxima; SaansMono pode ser aproximado com **JetBrains Mono** em peso 400.

## Layout

### Sistema de Espaçamento

- **Unidade base**: 8px.
- **Tokens (front matter)**: `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 96px.
- Padding interno de cards: `{spacing.lg}` 24px em cards de pricing/feature; `{spacing.xl}` 32px em cards de depoimento/desconto; `{spacing.xxl}` 48px em banners CTA.
- Padding de botão pill: 10px vertical · 18px horizontal.

### Grid e Container

- A largura máxima de conteúdo fica em torno de 1280px.
- Grids de cards são 3 colunas no desktop, 2 no tablet, 1 no mobile.
- O grid de tiers de pricing é 3 colunas; a faixa de comparação abaixo mostra checkmarks por tier.
- Cards de mockup de produto ocupam a largura total do conteúdo — são os protagonistas de cada seção.

### Filosofia de Espaço em Branco

A canvas creme faz o trabalho que o espaço em branco faria em outra marca. As seções se separam por amplo respiro vertical (`{spacing.section}` 96px) mais a elevação dos cards sobre o branco.

## Elevação e Profundidade

| Nível | Tratamento | Uso |
|---|---|---|
| 0 (flat) | Sem sombra, sem borda | Padrão para texto de corpo, texto de hero, footer |
| 1 (elevação sobre creme) | Fundo branco `{colors.surface-1}` sobre creme `{colors.canvas}` | Cards de pricing, feature cards, mockups de produto |
| 2 (elevação hairline) | `{colors.surface-1}` + borda de 1px `{colors.hairline}` | Tiles flutuantes com definição extra |
| 3 (acento profundo) | `{colors.inverse-canvas}` preto verdadeiro | Faixa de citação/depoimento |

A Intercom resiste a drop shadows. A profundidade é comunicada pela mudança de superfície branco-sobre-creme.

### Profundidade Decorativa

- **Mockups da UI do produto** dominam a coluna direita ou a faixa central de cada seção — são screenshots, não ilustrações.
- **Sem gradientes atmosféricos, sem spotlight cards, sem blocos de seção em tons pastel.** O sistema creme + branco é deliberadamente contido.

## Formas

### Escala de Border Radius

| Token | Valor | Uso |
|---|---|---|
| `{rounded.xs}` | 4px | Chips pequenos, badges |
| `{rounded.sm}` | 6px | Tags inline |
| `{rounded.md}` | 8px | Todos os botões, inputs de formulário |
| `{rounded.lg}` | 12px | Cards de pricing, feature cards, linhas de FAQ |
| `{rounded.xl}` | 16px | Cards de mockup de produto |
| `{rounded.xxl}` | 24px | Banners CTA grandes |
| `{rounded.pill}` | 9999px | Toggles de tab |
| `{rounded.full}` | 9999px | Círculos de avatar |

### Geometria de Fotografia e Ilustração

- Screenshots da UI do produto dominam a superfície de marketing; ficam em tiles `{rounded.xl}` de 16px.
- Tiles de logo de cliente renderizam em tamanhos pequenos (~24–32px de altura de logo) sobre creme `{colors.canvas}` sem borda.
- Círculos de avatar em cards de depoimento usam `{rounded.full}` em tamanhos de 40–48px.

## Componentes

### Botões

**`button-primary`** — CTA carvão. O CTA primário padrão em todas as páginas.
- Fundo `{colors.ink}`, texto `{colors.on-primary}`, tipo `{typography.button}`, padding 10px 18px, rounded `{rounded.md}`.
- O estado pressionado vive em `button-primary-pressed`.

**`button-secondary`** — Botão branco sobre creme. Usado em CTAs secundários.
- Fundo `{colors.surface-1}`, texto `{colors.ink}`, tipo `{typography.button}`, padding 10px 18px, rounded `{rounded.md}`. Borda de 1px `{colors.hairline}`.

**`button-tertiary`** — Botão de texto simples.
- Fundo `{colors.canvas}`, texto `{colors.ink}`, tipo `{typography.button}`, rounded `{rounded.md}`, padding 10px 18px.

**`button-fin`** — CTA Fin Orange — reservado para CTAs do produto Fin AI.
- Fundo `{colors.fin-orange}`, texto `{colors.on-primary}`, tipo `{typography.button}`, rounded `{rounded.md}`, padding 10px 18px.

### Tabs de Pricing

**`pricing-tab-default`** + **`pricing-tab-selected`** — Toggle pill na página `/pricing`.
- Padrão: fundo `{colors.canvas}`, texto `{colors.ink-muted}`, rounded `{rounded.pill}`.
- Selecionada: fundo branco `{colors.surface-1}`, texto `{colors.ink}` — selecionada = elevação sobre o branco.

### Cards e Containers

**`pricing-card`** — Cada tier na página `/pricing`.
- Fundo `{colors.surface-1}`, texto `{colors.ink}`, tipo `{typography.body}`, rounded `{rounded.lg}`, padding 24px.

**`pricing-card-featured`** — Tier em destaque/recomendado — inverte para carvão.
- Fundo `{colors.ink}`, texto `{colors.on-primary}`, estrutura idêntica.

**`feature-card`** — Destaque genérico de funcionalidade.
- Fundo `{colors.surface-1}`, texto `{colors.ink}`, tipo `{typography.body}`, rounded `{rounded.lg}`, padding 24px.

**`product-mockup-card`** — O tipo de card dominante — enquadra um screenshot de alta fidelidade da UI do produto.
- Fundo `{colors.surface-1}`, texto `{colors.ink}`, tipo `{typography.body}`, rounded `{rounded.xl}`, padding 24px.

**`testimonial-card`** — Citação de cliente com avatar + nome + empresa.
- Fundo `{colors.surface-1}`, texto `{colors.ink}`, tipo `{typography.body-lg}`, rounded `{rounded.lg}`, padding 32px.

**`startup-discount-card`** — O card tingido de "Startups ganham 90% de desconto".
- Fundo `{colors.surface-2}`, texto `{colors.ink}`, tipo `{typography.body}`, rounded `{rounded.lg}`, padding 32px.

**`customer-logo-tile`** — Tile pequeno no marquee de clientes.
- Fundo `{colors.canvas}`, texto `{colors.ink-muted}`, tipo `{typography.caption}`, rounded `{rounded.xs}`, padding 16px.

**`cta-banner`** — Painel de CTA de fechamento perto do fim da página.
- Fundo `{colors.surface-1}`, texto `{colors.ink}`, tipo `{typography.headline}`, rounded `{rounded.lg}`, padding 48px.

### Inputs e Formulários

**`text-input`** + **`text-input-focused`** — Campos de formulário em overlays de contato e busca.
- Fundo `{colors.surface-1}`, texto `{colors.ink}`, tipo `{typography.body}`, rounded `{rounded.md}`, padding 10px 14px.

### FAQ

**`faq-row`** — Linha de acordeão expansível no FAQ de pricing.
- Fundo `{colors.canvas}`, texto `{colors.ink}`, tipo `{typography.body}`, rounded `{rounded.md}`, padding 24px. Régua inferior de 1px `{colors.hairline-soft}`.

### Navegação

**`top-nav`** — Barra creme sticky com a wordmark Intercom à esquerda, links de nav centralizados, par log-in + sign-up à direita.
- Fundo `{colors.canvas}`, texto `{colors.ink}`, tipo `{typography.body-sm}`, altura 56px.

### Footer

**`footer`** — Grid denso de links sobre creme `{colors.canvas}` com a wordmark Intercom à esquerda.
- Fundo `{colors.canvas}`, texto `{colors.ink-muted}`, tipo `{typography.caption}`, padding 64px 32px.

## Faça e Não Faça

### Faça

- Reserve a canvas creme `{colors.canvas}` como a superfície âncora do sistema — nunca substitua por branco puro.
- Eleve os cards do creme para o branco (`{colors.surface-1}`) para criar hierarquia.
- Use o **`button-fin`** Fin Orange APENAS em CTAs do produto Fin AI e badges Fin.
- Combine display Saans em peso 500 com corpo em 400.
- Use screenshots da UI do produto como protagonista de cada seção.
- Use `{rounded.lg}` 12px para cards e `{rounded.xl}` 16px para tiles de mockup de produto.
- Aplique tracking negativo proporcionalmente aos tamanhos de display.

### Não Faça

- Não use branco puro como canvas.
- Não use Fin Orange como fundo de seção ou como CTA primário genérico.
- Não adicione drop shadows aos cards flutuantes.
- Não introduza uma segunda família de display.
- Não arredonde CTAs em pill.
- Não escreva eyebrows em all-caps com tracking.
- Não promova as cores da paleta de relatórios para superfícies de nível de marca.
- Não combine CTAs carvão e CTAs Fin Orange na mesma viewport.

## Comportamento Responsivo

### Breakpoints

| Nome | Largura | Mudanças-Chave |
|---|---|---|
| Desktop-XL | 1440px | Layout desktop padrão |
| Desktop | 1280px | Grid de cards 3 colunas mantido |
| Tablet | 1024px | Grid de cards 3 → 2 colunas |
| Mobile-Lg | 768px | Comparação de pricing vira acordeão; nav vira hamburger |
| Mobile | 480px | Coluna única; display-xl escala de 72px → ~32px |

### Alvos de Toque

- CTAs mantêm ≥40px de altura de toque em todas as viewports.
- Pills de tab de pricing mantêm ≥40px de altura de toque.
- Inputs de formulário mantêm alvo de toque de ≥44px em telas touch.

### Estratégia de Colapso

- **Top nav**: links colapsam para hamburger abaixo de 768px; o CTA primário permanece visível.
- **Grids de cards**: 3 → 2 colunas em 1024px → 1 coluna abaixo de 768px.
- **Comparação de pricing**: colapsa em acordeão por tier abaixo de 768px.
- **Tipo de display**: `{typography.display-xl}` 72px escala em direção a `{typography.display-md}` 40px no mobile.

### Comportamento de Imagem

- Screenshots da UI do produto mantêm a proporção e nunca cortam.
- Logos de cliente no marquee podem colapsar de 6 para 3 colunas abaixo de 768px.

## Guia de Iteração

1. Foque em UM componente por vez e referencie-o pelo nome do token em `components:`.
2. Ao introduzir uma seção, decida primeiro se ela fica sobre o creme `{colors.canvas}` (padrão) ou se eleva para um card branco `{colors.surface-1}`.
3. O corpo padrão é `{typography.body}` em peso 400.
4. Rode `npx @google/design.md lint DESIGN.md` após edições.
5. Adicione novas variantes como entradas de componente separadas.
6. Trate o Fin Orange como acento de produto: apenas CTA Fin e badge Fin.
7. Abra cada seção com um screenshot de produto.

## Lacunas Conhecidas

- A **paleta de relatórios** vive nos dashboards de analytics do produto renderizados dentro dos mockups de marketing; está documentada por completude, mas não são cores de superfície da marca.
- O estilo de erro e validação de campos de formulário não é visível nas páginas inspecionadas.
- Dark mode não está documentado porque o site de marketing não tem tema escuro.
- As superfícies de produto helpdesk/inbox mostram estados de UI do produto que não são chrome de marketing formal.
- Saans e SaansMono são proprietárias; uma substituta open-source (Inter, Söhne, Geist) é aceitável.
