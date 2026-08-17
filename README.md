# Poe Ledger ⚖️

Poe Ledger é um overlay leve para Path of Exile, pensado para ficar aberto enquanto você joga, sem ocupar muito espaço na tela.

A ideia principal é ter uma janela pequena e útil, com modo compacto, e a opção de expandir quando quiser ver mais detalhes.

---

## Objetivo

Criar uma ferramenta de apoio ao jogador com foco em:

- patrimônio do personagem
- resumo econômico rápido
- overlay discreto e sempre visível
- janela compacta para ficar em segundo plano
- expansão para módulos futuros sem quebrar a estrutura

---

## Filosofia do projeto

- Minimalista: poucas coisas na tela, sem poluição visual
- Compactável: pode ficar em modo mini ou normal
- Útil enquanto joga: fácil de ler em segundos
- Modular: cada funcionalidade pode entrar como módulo separado
- Legal e leve: sem over-engineering, sem tanta complexidade ao iniciar

---

## Visão da interface

### Modo compacto

- mostra só o resumo principal
- valor total / patrimônio
- ícone de expansão para abrir mais detalhes
- transparente ou semi-transparente
- sempre no topo opcional

### Modo normal

- navegação por módulos
- painel de wealth
- configuração e ajustes
- hotkeys globais

Esse modelo deixa o app confortável para usar em jogo, sem precisar fechar a janela.

---

## Plano de criação

### Fase 1 — MVP

- Tauri + React + TypeScript
- janela overlay leve
- modo compacto / expandido
- sempre no topo
- hotkeys globais
- módulo de Wealth funcional
- ajustes básicos de visual e opacidade

### Fase 2 — Economia

- preços de itens
- cache local
- atualização manual e automática
- informações mais úteis para mercado

### Fase 3 — Trade e utilidade

- preço rápido
- histórico e avaliação
- melhor suporte ao comércio

### Fase 4 — Expansão

- inventory/stash
- mapas e economia
- módulos extras sem bagunçar a base

---

## Stack atual

- React 19
- TypeScript
- Vite
- Tauri 2
- Rust

---

## Requisitos

- Node.js v20+
- Rust + Cargo
- compilador C/C++ do ambiente Windows

---

## Execução local

```bash
npm install
npm run tauri dev
```

Para build final:

```bash
npm run tauri build
```

---

## Atalhos planejados

- Ctrl + Shift + Space: mostrar/ocultar overlay
- Ctrl + Shift + R: atualizar wealth/preços
- Ctrl + Shift + M: alternar modo compacto

---

## Direção final

O projeto deve ser um overlay pequeno, útil e discreto, que pode permanecer aberto enquanto você joga, mas com a flexibilidade de aumentar quando quiser ver mais detalhes.

Em resumo: menos poluição visual, mais funcionalidade útil, e uma experiência que não atrapalha a gameplay.

---

## Licença

MIT. Consulte o arquivo [LICENSE](LICENSE).
