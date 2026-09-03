# Design: Home da Admissao Digital

## Objetivo

Atualizar a pagina publica inicial (`/`) para se inspirar na presenca digital de RH Coelho Diniz, com uma linguagem editorial clean, contemporanea e alinhada aos tokens existentes do projeto. A pagina continuara exibindo as vagas mockadas atuais e preservara os fluxos de candidatura e acesso do RH.

## Direcao visual

- Fundo canvas creme e superficies brancas conforme `DESIGN.md`.
- Hero escuro com amarelo Coelho Diniz como acento principal, sem reproduzir a composicao antiga literalmente.
- Tipografia de alto contraste entre eyebrow, headline e texto de apoio.
- Cards de vagas com imagens locais, bordas hairline, raios discretos e hover sutil.
- Ornamento limitado a blocos de cor, textura/gradientes suaves e imagens; sem excesso de sombras ou elementos decorativos.

## Estrutura da pagina

1. **Header**
   - Marca Coelho Diniz RH usando o componente `Logo` quando adequado.
   - Navegacao para vagas, candidatura e acesso RH.
   - Header fixo ou sticky, com versao compacta para telas pequenas.
2. **Hero**
   - Painel escuro com headline sobre comecar uma nova etapa profissional.
   - CTA primario para `/rh/login-candidato` e CTA secundario para `#vagas`.
   - Um asset/banner local da referencia usado como elemento visual, com crop responsivo e tratamento de contraste.
3. **Vagas disponiveis**
   - Mantem os seis itens mockados existentes em `vagasDestaque`.
   - Cards com imagens locais associadas por categoria, cargo, setor e tipo.
   - Cada card leva para `/rh/login-candidato`.
4. **Inclusao e aprendizagem**
   - Bloco escuro ou contrastante para PCD, com CTA de candidatura.
   - Card complementar para o programa de aprendizagem, com informacoes atuais e icones existentes.
5. **Quem somos**
   - Texto institucional existente em composicao mais arejada e curta.
6. **Footer**
   - Marca, contato, menu e links preservados.

## Assets

- Baixar somente imagens publicas utilizadas na referencia para `apps/web/public/images/`.
- Preferir nomes sem acentos e extensoes originais quando compativeis.
- Usar `alt` descritivo em imagens informativas; imagens puramente decorativas devem ter `alt=""`.
- Nao adicionar dependencia de CDN para os assets principais da home.

## Comportamento e acessibilidade

- Layout mobile-first: uma coluna no celular, duas em telas medias e tres em desktop para as vagas.
- Navegacao e CTAs acessiveis por teclado, com estados de foco visiveis.
- Contraste suficiente entre texto, fundo escuro e amarelo de marca.
- Respeitar `prefers-reduced-motion` para animacoes de entrada e hover.
- Manter semantica de `header`, `nav`, `main`, `section` e `footer`.

## Escopo tecnico

- Concentrar a alteracao em `apps/web/src/pages/public/VagasPage.tsx` e estilos globais somente quando necessario.
- Reutilizar React Router, Lucide e componentes/padroes ja presentes.
- Nao alterar API, modelo de dados ou autenticacao.

## Validacao

- Rodar `pnpm --filter web lint`.
- Rodar `pnpm --filter web build`.
- Confirmar que links para `/rh/login-candidato`, `/rh/login` e `#vagas` permanecem validos.
- Confirmar que as seis vagas mockadas continuam presentes no markup renderizado.
