# PRD Front — Louvor JA Desktop

> Origem: interface criada no Google Stitch.  
> Documento traduzido e alinhado à stack real do projeto (`Vue 3 + Electron + TypeScript`).  
> Documentos relacionados: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) · [MODULE_MAPPING.md](./MODULE_MAPPING.md)

## 1. Visão geral do projeto

**Louvor JA** (CentralJA) é um aplicativo desktop de gerenciamento de culto voltado a igrejas. Oferece ferramentas para biblioteca de músicas, leitura bíblica e utilitários, com foco em projeção visual de alta qualidade e interface amigável.

## 2. Visão de design e identidade

A aplicação segue uma estética **moderna e imersiva**:

* **Linguagem visual:** glassmorphism, gradientes radiais suaves e tipografia limpa.
* **Temas:** Ethereal Lumens (escuro) e Luminous Clarity (claro/suave) — detalhes em [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).
* **Navegação:** barra inferior inspirada em mobile (Footer Menu), maximizando o espaço vertical para o conteúdo.

## 3. Requisitos funcionais principais

### 3.1 Navegação principal

* **Barra de navegação inferior:** fixa na parte inferior da tela em todas as páginas.
  * **Itens:** Início (Home), Álbuns, Bíblia, Utilitários, Configurações.
  * **Interação:** efeito de magnificação no estilo macOS Dock ao passar o mouse (escala e elevação suaves).
* **Navegação superior (somente Configurações):** abas para subseções: Aparência, Geral, Mídia & Player, Projeção & Telas.

Mapeamento para módulos do código: [MODULE_MAPPING.md](./MODULE_MAPPING.md).

### 3.2 Telas e conteúdo

* **Tela inicial (Home):** logo da marca centralizado, barra de busca em destaque para descoberta de músicas e informação de versão no canto.
* **Configurações — Aparência:** alternância claro/escuro, sincronização automática de brilho e controles de intensidade do glassmorphism (ajuste de blur).
* **Configurações — Projeção:** configuração de janelas popup e quantidade de projeções.
* **Hardware e execução:** toggles para aceleração de hardware e inicialização em tela cheia.

## 4. Ativos visuais

* **Logo oficial:** marca circular com clave de sol estilizada em fundo amarelo/azul.
* **Tipografia:** Inter (títulos, labels e corpo).
* **Ícones:** Material (Home, Music, Book, Construction, Settings).

Detalhes de tokens e temas: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

## 5. Especificações técnicas

* **Plataforma:** desktop (proporção landscape / tela larga).
* **Stack oficial:**
  * Vue 3 + TypeScript
  * Electron
  * Vuetify (componentes ricos)
  * Tailwind (apenas layout)
  * Pinia, Vue Router, Vue I18n
  * Vite
* **Interatividade:** transições suaves na troca de tema e nos estados de hover.

> Nota: o brief original do Stitch citava HTML/CSS/JS vanilla. No CentralJA, a UI do Stitch é a referência visual; a implementação segue a stack acima.

## 6. Diretrizes de implementação (Front)

* Respeitar glassmorphism, gradientes e tipografia do design system.
* Navegação principal sempre via footer menu.
* Tailwind apenas para layout; Vuetify para componentes ricos.
* Temas claro/escuro e intensidade de blur devem ser configuráveis.
* Textos de UI via i18n; sem hardcode.
* Shell e navegação em `layouts/`; features em `modules/`.
