# Central - Louvor JA

Aplicativo desktop para gerenciamento de culto — músicas, bíblia, utilitários e projeção.

Este projeto é um fork de recursos em relação ao app Louvor JA ([app.louvorja.com.br](https://app.louvorja.com.br/), [github.com/louvorja/app](https://github.com/louvorja/app)), onde as principais ferramentas são migradas e adaptadas para as tecnologias usadas neste projeto.

O **Central Adoração**, além de incluir os recursos do App Louvor JA, vai incorporar ao longo do desenvolvimento outras funcionalidades voltadas ao contexto ministerial e educacional.

Pacote: `centralja` · Plataformas: Windows, macOS e Linux.

---

## Versões do produto

O Central Adoração / Louvor JA existe em **duas linhas de entrega**:

| Versão | Escopo | Este repositório |
|--------|--------|------------------|
| **Electron (desktop)** | App nativo para Windows, macOS e Linux | **Sim** |
| **Web** | Aplicação exclusiva para navegador | Não |

Este README cobre apenas a **versão Electron**. A versão web é um projeto separado, pensado para uso no browser, sem o shell desktop.

---

## Roadmap (além do Louvor JA)

| Área | Exemplos |
|------|----------|
| **Agenda ministerial** | Escalas e gestão de cargos no âmbito distrital — pregação, músicas, eventos, escala pastoral, etc. |
| **Jogos bíblicos** | Atividades para adultos, crianças, Desbravadores e Aventureiros |
| **Estudos bíblicos** | Conteúdo e fluxos de estudo |
| **Outros** | Novos recursos conforme a evolução do produto |

---

## Stack

- Vue 3 (Composition API) + TypeScript
- Electron + Vite
- Pinia · Vue Router · Vue I18n
- Vuetify (componentes ricos) · Tailwind CSS (layout)
- Design system próprio (`src/design-system/`)

---

## Arquitetura

Separação clara entre **shell Electron**, **renderer Vue** e **features modulares**.

```
electron/                 → processo principal (main, preload, ipc)
src/                      → renderer (Vue)
  design-system/          → linguagem visual (tokens, temas, primitivas)
  layouts/                → shell da UI (header + dock + RouterView)
  modules/                → features isoladas por domínio
  shared/                 → código compartilhado NÃO visual
  router/                 → agrega as rotas de cada módulo
  plugins/ locales/ styles/ assets/
```

### Camadas

| Camada | Responsabilidade |
|--------|------------------|
| `electron/` | Janela, ciclo de vida, IPC, bridge segura (`preload`) |
| `design-system/` | Tokens, temas, glass, dock, backgrounds — sem regra de negócio |
| `layouts/` | Compõe o design system e hospeda as páginas |
| `modules/` | Funcionalidades (home, bible, liturgy, clock, draw, timer, settings) |
| `shared/` | Utilitários, services e widgets de domínio reutilizáveis |
| `router/` | Registra `routes.ts` de cada módulo |

### Contrato de um módulo

Cada feature em `src/modules/<nome>/` segue o mesmo formato:

```
modules/<nome>/
├── components/
├── composables/
├── services/
├── stores/       # Pinia do módulo
├── types/
├── locales/
├── views/
└── routes.ts     # exportado para o router global
```

Fluxo: **módulo exporta rotas** → **router agrega** → **layout renderiza via `<RouterView />`**.

### Design system

- Temas: Ethereal Lumens (escuro) e Luminous Clarity (claro)
- Navegação principal: footer estilo macOS Dock
- Primitivas: `GlassCard`, `DockFooter`, `GradientBackground`, …
- Tailwind **só para layout** · Vuetify **para componentes ricos**
- Alias: `@design-system` — módulos não reimplementam glass/dock/gradient

### Aliases principais

`@` · `@modules` · `@shared` · `@design-system` · `@layouts` · `@plugins` · `@themes` · `@styles` · `@locales` · `@assets`

---

## Começar

Requisito: Node.js `^22.18.0` ou `>=24.12.0`

```bash
npm install
npm run dev              # browser
npm run electron:dev     # janela Electron + hot-reload
```

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento no browser (porta 5173) |
| `npm run host` | Vite na rede local |
| `npm run build` | Type-check + build de produção |
| `npm run preview` | Preview do build no browser |
| `npm run electron:dev` | Electron + Vite |
| `npm run electron:preview` | Abre o build no Electron |
| `npm run electron:build` | Gera instalador (`electron-builder`) |
| `npm run version:patch` | Sobe patch (`1.0.0` → `1.0.1`), commit + tag `vX.Y.Z` |
| `npm run version:minor` | Sobe minor (`1.0.0` → `1.1.0`), commit + tag |
| `npm run version:major` | Sobe major (`1.0.0` → `2.0.0`), commit + tag |
| `npm run git:publish` | Push do branch atual + tags |
| `npm run git:tag` | Cria/envia só a tag da versão atual do `package.json` (se ainda não existir) |

```bash
npm run electron:build -- --linux
npm run electron:build -- --win
npm run electron:build -- --mac
```

### Versionamento

```bash
npm run version:patch   # ou :minor / :major
npm run git:publish     # envia commit e tags ao remoto
```

Aliases: `version:bug` → patch · `version:min` → minor · `version:max` → major.

---

## Licença

Projeto privado — Louvor JA.
