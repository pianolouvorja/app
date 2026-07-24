# Design System — Louvor JA Desktop

> Fonte visual: Google Stitch.  
> PRD funcional: [FRONT_PRD.md](./FRONT_PRD.md) · Mapeamento de módulos: [MODULE_MAPPING.md](./MODULE_MAPPING.md)

## 1. Princípios

* Estética **moderna e imersiva**
* Glassmorphism + gradientes radiais suaves
* Tipografia limpa e hierarquia clara
* Otimizado para desktop landscape e ambientes de culto (baixa e alta luminosidade)

## 2. Temas

### Ethereal Lumens (Escuro)

Tema escuro para projeção e baixa luminosidade.

* Superfícies profundas com gradientes radiais
* Reduz fadiga visual

### Luminous Clarity (Claro / Suave)

Tema claro e suave.

* Tema delicado, **sem branco puro**
* Uso diurno
* Foco em legibilidade e suavidade

Ambos os temas devem permitir:

* Alternância manual claro/escuro
* Sincronização automática de brilho (quando disponível)
* Controle de intensidade do glassmorphism (blur)

## 3. Tokens

### Primary

`#2196f3` — ações, destaques e estados ativos.

### Radius

`8px` (`ROUND_EIGHT`) — cards, inputs e cantos padrão.

### Glass

* `backdrop-blur`
* Translucent surfaces (`backdrop-filter` em cards e painéis)
* Intensidade **configurável** (tokens em `src/design-system/tokens/blur.ts`)

### Spacing

Grade base de **8px** (derivada de `ROUND_EIGHT`), em `src/design-system/tokens/spacing.ts`.  
O Stitch não listou uma escala completa; usamos esta grade para layout consistente.
## 4. Tipografia

* **Família:** Inter
* Aplicar de forma consistente em títulos, labels e corpo de texto

## 5. Ícones

* Estilo Material
* Navegação principal:
  * Início → Home
  * Álbuns → Music
  * Bíblia → Book
  * Utilitários → Construction
  * Configurações → Settings

## 6. Logo

* Marca circular
* Clave de sol estilizada
* Fundo amarelo/azul

## 7. Navegação e motion

* Footer estilo macOS Dock (fixo na base)
* Hover: escala + elevação suaves
* Transições suaves na troca de tema e estados interativos

## 8. Destino no código

| Conceito | Pasta |
|----------|-------|
| Tokens (radius, cores, blur) | `src/design-system/tokens/` |
| Temas Ethereal Lumens / Luminous Clarity | `src/design-system/themes/` |
| Animações (dock, theme switch) | `src/design-system/animations/` |
| GlassCard, BlurContainer | `src/design-system/components/glass/` |
| DockFooter | `src/design-system/components/navigation/` |
| GradientBackground | `src/design-system/components/backgrounds/` |
| Shell da aplicação | `src/layouts/` (usa os componentes acima) |
| Entrada Tailwind / CSS global | `src/styles/` |
| Logo e fontes | `src/assets/` |

## 9. Regras de uso

* Tailwind **apenas para layout**
* Vuetify para **componentes ricos**
* Não inventar tokens fora deste documento sem atualizá-lo
* Manter contraste adequado nos dois temas
