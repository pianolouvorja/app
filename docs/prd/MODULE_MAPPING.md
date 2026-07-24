# Mapeamento de Módulos — Louvor JA Desktop

> Relaciona a navegação e telas do PRD de front com a arquitetura modular do código.  
> PRD: [FRONT_PRD.md](./FRONT_PRD.md) · Design: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)

## 1. Navegação principal → módulos

| Item do Footer (PRD) | Destino no código |
|----------------------|-------------------|
| Home / Início | `modules/home` |
| Bíblia | `modules/bible` |
| Utilitários | `modules/clock`, `modules/draw`, `modules/timer` |
| Álbuns | `modules/albums` (catálogo + lista de faixas) + `modules/media` (player) |
| Liturgia | `modules/liturgy` |
| Configurações | `modules/settings` |

## 2. Utilitários (submódulos)

| Utilitário | Pasta |
|------------|-------|
| Relógio | `modules/clock` |
| Desenho | `modules/draw` |
| Timer | `modules/timer` |

## 3. Mídia / Player / Álbuns

| Item do PRD | Pasta |
|-------------|-------|
| Reprodução de músicas / slides | `modules/media` |
| Hinários e coletâneas (lista + ações) | `modules/albums` |
| Ações por faixa (cantado / playback / sem áudio / letra) | `AlbumTrackActions` → `useMediaStore.open` |
| Play de item `music` na liturgia | `modules/liturgy` → `useMediaStore.open` |
| Chrome flutuante (FAB + preview) | `MediaChrome` / `LiturgyMediaFab` |

## 4. Configurações

| Item do PRD | Pasta |
|-------------|-------|
| Configurações | `modules/settings` |

### Seções de UI (abas)

| Aba (PRD) | Responsabilidade sugerida |
|-----------|---------------------------|
| Aparência | Tema claro/escuro, blur/glassmorphism, brilho |
| Geral | Preferências gerais do app |
| Mídia & Player | Áudio/vídeo e player (`modules/media` + prefs em settings) |
| Projeção & Telas | Popups, quantidade de projeções, telas |

Implementação: views/componentes em `modules/settings/`, com tokens/temas em `src/design-system/`.

## 5. Shell e assets

| Conceito do PRD | Destino no código |
|-----------------|-------------------|
| Bottom navigation / shell | `src/layouts/` + `src/design-system/components/navigation/` |
| Temas Ethereal Lumens / Luminous Clarity | `src/design-system/themes/` |
| Glassmorphism, radius, cor primária | `src/design-system/tokens/` + `components/glass/` |
| Gradientes / backgrounds | `src/design-system/components/backgrounds/` |
| Logo e tipografia | `src/assets/` |
| Rotas agregadas | `src/router/` + `modules/*/routes.ts` |

## 6. Estrutura interna de cada módulo

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

## 7. Pendências de mapeamento

* Definir se **Utilitários** terá view hub própria ou apenas agrupamento na nav
* Alinhar nomes de rotas/i18n com os labels do footer do Stitch
