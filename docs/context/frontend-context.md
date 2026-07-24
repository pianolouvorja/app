# Contexto de Frontend

Brief operacional para implementação de UI.  
Detalhes e tokens: `docs/prd/DESIGN_SYSTEM.md`.  
Artefatos visuais: `docs/stitch/`.

## Consulte sempre

- `docs/prd/FRONT_PRD.md`
- `docs/prd/DESIGN_SYSTEM.md`
- `docs/prd/MODULE_MAPPING.md`
- `docs/stitch/<tela>/` (quando existir referência da tela)

## Estilo

* Moderno
* Imersivo
* Glassmorphism
* Desktop-first (landscape)

## Temas

* Ethereal Lumens (escuro — projeção / baixa luminosidade)
* Luminous Clarity (claro / suave)

## Elementos

* Footer estilo macOS Dock
* Gradientes radiais
* Cards translúcidos
* Blur configurável
* Tipografia Inter

## Regras

* Vuetify para componentes ricos
* Tailwind apenas para layout
* Seguir o Stitch como fonte visual (`docs/stitch/` + `docs/prd/`)
* UI sempre internacionalizada (Vue I18n)
* Shell (footer nav) em `src/layouts/` (compõe `@design-system`)
* Primitivas visuais (glass, dock, gradients, blur) em `src/design-system/`
* Telas em `src/modules/*/views/`
* Não reimplementar glass/dock/gradient dentro dos módulos
