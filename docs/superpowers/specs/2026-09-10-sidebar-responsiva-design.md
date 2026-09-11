# Sidebar Responsiva

## Objetivo

Disponibilizar a navegacao administrativa em celular e tablet, onde a sidebar fixa atual fica oculta abaixo de 1024px.

## Solucao

- Manter a sidebar fixa no desktop a partir de `lg`.
- Exibir um botao de menu no cabecalho abaixo de `lg`.
- Abrir a mesma navegacao em painel lateral sobreposto, sem reduzir a largura do conteudo.
- Fechar o painel ao navegar, tocar no backdrop ou pressionar Escape.
- Expor estado e controles acessiveis com `aria-expanded`, `aria-controls` e foco no painel ao abrir.

## Verificacao

- Checar tipos e build do app web.
- Garantir que as permissoes de navegacao existentes para RH e administrador continuem as mesmas.
