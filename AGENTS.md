# AGENTS.md — PIANO Electron (APP Desktop)

Convenções de código para este repositório (humanos e ferramentas de IA).

## Escopo

- Aplicação **desktop** (Electron) para o operador do culto.
- Multi-monitor e IPC nativos ficam neste repo.
- Layout mobile / responsividade fina é responsabilidade da versão **web**, não deste APP.

## Stack

- Vue 3 — Composition API, `<script setup lang="ts">` (sem Options API)
- TypeScript strict, Vite, Pinia, Vue Router (hash no Electron), Vue I18n
- Vuetify + Tailwind CSS v4 + tokens `--ds-*`
- Electron — processo principal em `electron/main.mjs` (ESM)
- Tabler Icons (`ti-`) em código novo (evitar MDI em código novo)
- Fonte: Plus Jakarta Sans

## Estrutura de módulo

```
src/modules/<nome>/
├── components/
├── composables/
├── services/
├── stores/
├── types/
├── views/
├── routes.ts
└── locales/pt-BR.ts
```

## Nomenclatura

- Componentes Vue: `PascalCase.vue`
- Serviços: `kebab-case.ts`
- Composables: `useXxx.ts`
- Tipos: `PascalCase`
- Constantes: `UPPER_SNAKE_CASE`

## Padrões

- Props e emits tipados
- Preferir `ref` / `computed`; evitar `any` explícito
- Persistência: Component → Composable → Store → Preferences Service → storage
- i18n pt-BR com `$t('chave')` — sem textos de UI hardcoded
- Visual reutilizável em `src/design-system/`; domínio compartilhado em `src/shared/`
- Processo Electron apenas em `electron/` — não expor APIs Node no renderer
- Bridge desktop: checar `isDesktopApp()` antes de usar a API de displays/projeção

## Cuidados

- Runtime do main: `electron/main.mjs` (não confundir com stubs `.ts`)
- `displayId` (monitor) ≠ `slot` da versão web
- Breakpoints: `useDisplay()` do Vuetify neste repo
- Não copiar código legado integralmente — refatorar comportamento

## Mensagens de commit

Padrão **Conventional Commits** em português (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, …).  
Resumo curto no imperativo, focando no efeito — detalhes e exemplos em `docs/checklists/commit-messages.md`.

## Documentação pública

- Guia: `docs/DEVELOPER.md`
- Contexto: `docs/context/`
- Produto / design: `docs/prd/`
- Projeção: `docs/context/projection-electron.md` (se existir)
- Commits: `docs/checklists/commit-messages.md`
- PR: `docs/checklists/pr-checklist.md`
- Release: `docs/checklists/release-checklist.md`
