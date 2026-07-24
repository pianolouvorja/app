# Contexto do Projeto

## Nome

CentralJA (pacote: `centralja`)

## Contexto

Projeto desktop para gerenciamento de culto.

## Objetivos

- Arquitetura modular
- Desenvolvimento orientado por IA
- Refatoração obrigatória do sistema legado
- Internacionalização
- Alto reaproveitamento de componentes
- Novo layout e arquitetura visual
- Novo padrão de nomenclatura

## Escopo (módulos)

| Módulo | Pasta | Função |
|--------|-------|--------|
| Home | `modules/home` | Tela inicial / hub |
| Álbuns | `modules/albums` | Catálogo de coletâneas (em evolução) |
| Liturgia | `modules/liturgy` | Programação litúrgica |
| Mídia / Player | `modules/media` | Reprodução e projeção de músicas |
| Bíblia | `modules/bible` | Leitura e projeção bíblica |
| Relógio | `modules/clock` | Relógio em projeção |
| Desenho | `modules/draw` | Desenho / anotação |
| Timer | `modules/timer` | Contagem regressiva |
| Configurações | `modules/settings` | Preferências do app |

Mapeamento nav → módulos: `docs/prd/MODULE_MAPPING.md`.

## Stack

| Tecnologia | Uso |
|------------|-----|
| Vue 3 | UI (Composition API) |
| TypeScript | Tipagem |
| Electron | Shell desktop |
| Vuetify | Componentes ricos |
| Tailwind | Layout apenas |
| Pinia | Estado |
| Vue Router | Rotas |
| Vue I18n | Internacionalização |
| Vite | Build e dev server |

## Legado

- `Legado/StackVue/electron`
- `Legado/StackVue/web`

Referência de comportamento e regras de negócio apenas. Sem cópia integral. Detalhes: `docs/context/migration-rules.md`.

## Documentação por responsabilidade

| Pasta / arquivo | Papel |
|-----------------|-------|
| `docs/prd/` | Fonte da verdade de produto/design (PRD, tokens, mapeamento) |
| `docs/stitch/` | Artefatos exportados do Stitch (prints, HTML, notas por tela) |
| `docs/context/` | Contexto operacional (projeto, front, arquitetura, migração) |
| `docs/prompts/` | Prompts reutilizáveis (`examples.md` = como perguntar à IA) |
| `.cursor/rules.md` | Regras curtas de execução no Cursor |

## Estado atual

- Estrutura de pastas criada
- Bootstrap Vue mínimo em `src/main.ts`
- Electron (`main`, `preload`, `ipc`) preparado, ainda sem implementação
- Documentação concentrada em `docs/`
