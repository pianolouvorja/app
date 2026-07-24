# Regras de Migração

## Princípio central

O legado é **referência de comportamento**, não fonte de cópia. Toda migração passa por refatoração.

## Localização do legado

Paths relativos à raiz do monorepo (`LouvorJA/`):

| Linha | Caminho |
|-------|---------|
| Electron | `Legado/StackVue/electron` |
| Web | `Legado/StackVue/web` |

Escopo e visão geral do legado: `docs/context/project-context.md`.

## O que reutilizar

- Regras de negócio e fluxos funcionais
- Conceitos de domínio (bíblia, liturgia, timer, etc.)
- Requisitos de UX já validados no legado

## O que NÃO fazer

- Não copiar código integralmente do legado
- Não reutilizar nomes de variáveis, componentes, stores ou serviços do legado
- Não espelhar a árvore de pastas antiga
- Não trazer Options API
- Não colocar lógica de negócio diretamente nas views
- Não misturar responsabilidades entre módulos

## Padrões obrigatórios no novo código

1. **Composition API** (`<script setup>` / composables)
2. **TypeScript** tipado (interfaces/DTOs em `types/`)
3. **i18n** — textos de UI via Vue I18n, nunca hardcoded
4. **Tailwind apenas para layout**; tokens/temas/animações em `src/design-system/`
5. **Vuetify** para componentes ricos
6. **Pinia** para estado (stores por módulo quando possível)
7. **Arquitetura modular** — feature isolada em `modules/<nome>/`
8. **Código desacoplado** — services e composables fora das views
9. **Primitivas visuais** em `design-system/`; widgets de domínio em `shared/`

## Nomenclatura

- Usar nomes novos e claros em inglês ou português consistente com o resto do projeto
- Preferir nomes descritivos do domínio atual, não aliases do legado
- Stores: `useXxxStore`
- Composables: `useXxx`
- Services: `xxxService` ou funções nomeadas por ação

## Processo sugerido por feature

1. Entender o comportamento no legado
2. Extrair regras de negócio (sem colar código)
3. Modelar `types/` do módulo
4. Implementar `services/` e `stores/`
5. Criar `composables/` e `components/`
6. Montar `views/` e `routes.ts`
7. Adicionar `locales/` do módulo
8. Validar i18n, tipagem e isolamento do módulo

## Electron

- Main process apenas em `electron/`
- Comunicação renderer ↔ main via preload + IPC tipado
- Não expor APIs Node diretamente no renderer

## Qualidade

- Preferir mudanças pequenas e focadas
- Manter módulos independentes o máximo possível
- Evitar dependências circulares entre módulos
- Shared só para o que for genuinamente compartilhado
