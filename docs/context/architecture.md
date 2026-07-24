# Arquitetura

## Visão geral

Aplicação Vue 3 + Electron com organização modular por feature.

- Renderer: `src/`
- Main process: `electron/`
- Produto/design: `docs/prd/`
- Artefatos Stitch: `docs/stitch/`
- Contexto operacional: `docs/context/`
- Prompts: `docs/prompts/`

## Estrutura raiz

```
StackVue/electron/
├── .cursor/             # Regras do agente Cursor
├── docs/
│   ├── prd/             # PRD, design system, mapeamento
│   ├── stitch/          # Exports do Stitch por tela
│   ├── context/         # Contexto operacional (IA + time)
│   └── prompts/         # Prompts reutilizáveis
├── electron/            # Processo principal Electron
│   ├── main.ts
│   ├── preload.ts
│   └── ipc/
├── src/                 # Renderer (Vue)
├── public/
├── vite.config.ts
└── package.json
```
## Estrutura `src/`

```
src/
├── app/                 # Bootstrap da aplicação
├── assets/              # Imagens, fontes, mídia estática
├── design-system/       # Linguagem visual (tokens, temas, primitivas)
├── layouts/             # Shell principal (compõe o design-system)
├── locales/             # Traduções globais
├── modules/             # Funcionalidades (features)
├── plugins/             # Vue plugins (Vuetify, i18n, etc.)
├── router/              # Router global (agrega rotas dos módulos)
├── shared/              # Código compartilhado NÃO visual
└── styles/              # CSS/SCSS globais (ex.: entrada Tailwind)
```

## Design System

Camada da identidade visual do Stitch. Primitivas reutilizáveis — não colocar regra de negócio aqui.

```
design-system/
├── tokens/              # radius, primary, glass/blur, etc.
├── themes/              # Ethereal Lumens / Luminous Clarity
├── animations/          # dock lift/scale, theme transitions
├── composables/         # useThemeManager, useBlurSystem
└── components/
    ├── glass/           # GlassCard, BlurContainer
    ├── navigation/      # DockFooter, BottomNavigation
    └── backgrounds/     # GradientBackground, ProjectionBackground
```

Alias: `@design-system`.  
`@themes` aponta para `src/design-system/themes`.

`layouts/` consome esses componentes (ex.: shell usa `DockFooter`).  
Módulos e `shared/` não reimplementam glass/dock/gradient.

## Shared

Código compartilhado entre módulos **sem** ser linguagem visual:

```
shared/
├── components/          # widgets de domínio/app reutilizáveis
├── composables/
├── services/
├── types/
├── constants/
└── utils/
```

## Módulo (padrão interno)

```
modules/<nome>/
├── components/
├── composables/
├── services/
├── stores/
├── types/
├── locales/
├── views/
└── routes.ts
```

Módulos: `home`, `albums`, `liturgy`, `media`, `bible`, `clock`, `draw`, `timer`, `settings`.  
Nav do PRD → pastas: `docs/prd/MODULE_MAPPING.md`.

## Electron

```
electron/
├── main.ts
├── preload.ts
└── ipc/
```

Ainda sem implementação completa — apenas estrutura preparada.

## Aliases Vite

| Alias | Caminho |
|-------|---------|
| `@` | `src/` |
| `@app` | `src/app` |
| `@modules` | `src/modules` |
| `@shared` | `src/shared` |
| `@design-system` | `src/design-system` |
| `@layouts` | `src/layouts` |
| `@plugins` | `src/plugins` |
| `@themes` | `src/design-system/themes` |
| `@assets` | `src/assets` |
| `@styles` | `src/styles` |
| `@locales` | `src/locales` |

## Responsabilidades por camada

| Camada | Responsabilidade |
|--------|------------------|
| `design-system/` | Tokens, temas, animações e primitivas visuais |
| `layouts/` | Shell da app (compõe design-system + router-view) |
| `views/` | Orquestração de UI do módulo; mínimo de lógica |
| `components/` (módulo) | UI específica da feature |
| `shared/` | Código/app compartilhado não visual (ou widgets de domínio) |
| `composables/` | Lógica reutilizável reativa |
| `services/` | I/O, persistência, IPC, HTTP |
| `stores/` | Estado compartilhado (Pinia) |
| `types/` | Contratos TypeScript |
| `plugins/` | Integração de libs no Vue |

## Fluxo de rotas

1. Cada módulo exporta rotas em `routes.ts`
2. `src/router/` importa e registra as rotas dos módulos
3. Views dos módulos usam o layout em `layouts/`
