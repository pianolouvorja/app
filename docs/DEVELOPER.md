# Guia do desenvolvedor

Referência técnica do **Louvor JA** (pacote `centralja`).  
Use este arquivo para consulta de arquitetura, scripts, módulos e Electron.  
Para visão rápida do projeto, veja o [README na raiz](../README.md).

---

## Contexto

App desktop para gerenciamento de culto: músicas, bíblia, utilitários e projeção.  
Reescrita do sistema anterior (`Legado/StackVue`), com nova arquitetura, TypeScript e design system próprio.

### Em relação ao legado

| Antes | Agora |
|-------|--------|
| Vuex | **Pinia** |
| JavaScript | **TypeScript** |
| Options API / BaseModule | **Composition API** + módulos tipados |
| Layout antigo | Design system + footer dock |
| SCSS dominante | **Tailwind** (layout) + **Vuetify** (componentes ricos) + SCSS pontual |
| Docs dispersas | Concentradas em `docs/` |

O legado serve só como **referência de comportamento**. Não copiar código integralmente — ver `context/migration-rules.md`.

---

## Stack

- **Vue 3** — Composition API (`<script setup>`)
- **TypeScript** — tipagem estrita
- **Electron** — shell desktop (Windows / macOS / Linux)
- **Vite** — build e HMR
- **Pinia** — estado (stores por módulo quando possível)
- **Vue Router** — rotas (hash em `file://` no Electron)
- **Vue I18n** — internacionalização
- **Vuetify** — componentes ricos
- **Tailwind CSS** — layout e utilitários
- **Design System** — tokens, temas, glass, dock (`src/design-system/`)

---

## Pré-requisitos e instalação

- Node.js `^22.18.0` ou `>=24.12.0`

```bash
npm install
```

---

## Scripts

| Comando | Para quê |
|---------|----------|
| `npm run dev` | UI no browser (Vite, porta 5173) |
| `npm run host` | Vite acessível na rede local |
| `npm run build` | Type-check + build de produção |
| `npm run preview` | Preview do build no browser |
| `npm run type-check` | Só `vue-tsc` |
| `npm run electron:dev` | Vite + janela Electron (hot-reload) |
| `npm run electron:preview` | Build com `base=./` e abre no Electron |
| `npm run electron:build` | Pacote instalável (`electron-builder`) |

```bash
npm run electron:build -- --linux
npm run electron:build -- --win
npm run electron:build -- --mac
```

Artefatos: `dist/` (Vite) e `dist-electron/` (instaladores).

---

## Estrutura

```
StackVue/electron/
├── electron/                 # Processo principal
│   ├── main.mjs
│   ├── preload.mjs
│   └── ipc/
├── src/
│   ├── design-system/        # Tokens, temas, glass, dock, backgrounds
│   ├── layouts/              # Shell (header + dock + RouterView)
│   ├── modules/              # Features (home, bible, liturgy, …)
│   ├── shared/               # Código compartilhado não visual
│   ├── router/               # Agrega rotas dos módulos
│   ├── plugins/              # Vuetify, i18n, …
│   ├── locales/              # Traduções globais
│   ├── styles/               # Tailwind + base CSS
│   └── assets/               # Logo, mídia
├── docs/
│   ├── prd/                  # PRD, design system, mapeamento de módulos
│   ├── stitch/               # Referências visuais por tela
│   ├── context/              # Contexto operacional
│   ├── prompts/
│   └── DEVELOPER.md          # Este guia
├── public/ico/
├── dist/
└── dist-electron/
```

### Contrato de módulo

```
src/modules/<nome>/
├── components/
├── composables/
├── services/
├── stores/          # Pinia do módulo
├── types/
├── locales/
├── views/
└── routes.ts
```

Módulos: `home`, `liturgy` (Álbuns), `bible`, `clock`, `draw`, `timer`, `settings`.

---

## Design System

Documentação canônica: `prd/DESIGN_SYSTEM.md` e `prd/FRONT_PRD.md`.

- Temas: **Ethereal Lumens** (escuro) e **Luminous Clarity** (claro)
- Navegação: footer estilo macOS Dock
- Glassmorphism, blur configurável, tokens tipados
- Primitivas: `GlassCard`, `DockFooter`, `GradientBackground`, …

Regras:

- Tailwind **só para layout**
- Vuetify **para componentes ricos**
- Glass / dock / gradient só via `@design-system` — não duplicar nos módulos

---

## Electron

- **Dev:** `electron:dev` → Vite em `http://127.0.0.1:5173`
- **Preview/prod:** `dist/index.html` com `base=./`
- Bridge: `preload.mjs` → `window.louvorja`
- Single-instance, ícone oficial, menu oculto
- Pacotes: Windows (NSIS), macOS (DMG), Linux (AppImage)

Os scripts removem `ELECTRON_RUN_AS_NODE` antes de iniciar o Electron (evita conflito em alguns ambientes).

---

## Índice da documentação

| Caminho | Conteúdo |
|---------|----------|
| `prd/` | PRD de front, design system, mapeamento nav → módulos |
| `stitch/` | Referências visuais por tela |
| `context/` | Arquitetura, migração, contexto de projeto/front |
| `prompts/` | Prompts reutilizáveis (`examples.md`, `create-screen.md`) |
| `../.cursor/rules.md` | Regras curtas do agente Cursor |

---

## Estado atual

- Home com logo, busca, dock e temas
- Design system + tokens + ThemeManager
- Vue Router integrado ao dock
- Electron pronto para dev, preview e build
- Demais rotas ainda com placeholder (“Em breve”)

---

## Licença

Projeto privado — Louvor JA.
