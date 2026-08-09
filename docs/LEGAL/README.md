# Piano LouvorJA — Suite Juridica

> Documentos juridicos gerados pelo Squad Juridico Agentico (Hermes Agent).
> First-pass AI — validacao por advogado OAB recomendada para pontos criticos.

## Contexto do Projeto

| Item | Detalhe |
|---|---|
| **Nome** | LouvorJA Piano |
| **Tipo** | App desktop (Electron + Vue 3 + Vuetify 3) |
| **Licenca** | MIT (open source) |
| **Organizacao** | GitHub org `pianolouvorja` |
| **Colaboradores** | Rafael Zendron (@rafaumeu) + Ezequias Fonseca (@ezequiasfonseca) |
| **Funcao** | Projecao de hinos/letras/playback em cultos (Igreja Adventista do Setimo Dia) |
| **Dados pessoais** | ZERO. Sem login, sem cadastro, sem email, sem telemetria |
| **Dados locais** | Preferencias do usuario (browser storage) + cache de catalogo JSON |
| **APIs externas** | API LouvorJA (catalogo de hinos), YouTube embed (projeção de videos) |
| **Plataformas** | Windows, Linux, macOS |
| **Pagamentos** | Nenhum. Software gratuito |
| **Publico** | Igrejas adventistas em todo Brasil |
| **Distribuicao** | GitHub Releases (binarios assinados) |
| **Dependencias** | 30 deps (electron, vue, vuetify, vite, pinia, tailwindcss, sass, etc.) |

## Documentos

| Arquivo | Funcao | Onde aplicar |
|---|---|---|
| `EULA.md` | Acordo de licenca de usuario final | Dialogo de primeiro uso, installer, README |
| `direitos-autorais-musicais.md` | Analise de risco de direitos autorais (Lei 9.610/98) | Documentacao interna, resposta a reclamacoes |
| `open-source-compliance.md` | Compliance de licencas e dependencias | Antes de cada release, verificacao de deps |

## Matriz APLICA / N/A (Squad Juridico — 19 dominios)

| Skill | Aplica? | Justificativa |
|---|---|---|
| `juridico-contratos-saas` | **SIM** | EULA necessaria para distribuicao do app |
| `juridico-direitos-autorais-musicais` | **SIM** | App projeta letras e executa audio de hinos — CRITICO |
| `juridico-open-source-compliance` | **SIM** | Projeto MIT com 30 deps, multi-colaborador |
| `juridico-civil-responsabilidade` | **SIM** | App pode causar dano (projeção falha em culto ao vivo) |
| `juridico-religioso-estatutario` | PARCIAL | Publico-alvo e religioso, mas o app nao e da igreja institucionalmente |
| `lgpd-compliance` | **N/A** | Zero coleta de dados pessoais. Sem login, sem telemetria, sem cookies de tracking |
| `juridico-tributario-pj-saas` | **N/A** | Software gratuito, sem receita |
| `juridico-saas-internacional` | **N/A** | Nao e SaaS. App desktop local |
| `juridico-consumidor-saas` | **N/A** | Sem relacao de consumo (gratuito, sem vendor-consumer) |
| `juridico-trabalhista-motoristas` | **N/A** | Sem motoristas/workers |
| `juridico-marcas-patentes` | PARCIAL | Nome "LouvorJA" deveria ser registrado no INPI (recomendacao futura) |
| `juridico-eleitoral-apps` | **N/A** | Sem conteudo politico-eleitoral |
| `juridico-ia-responsavel` | **N/A** | App nao usa IA/LLM/decisao automatizada |
| `juridico-cibercrime` | PARCIAL | App faz fetch de API remota — plano de incident response basico recomendado |
| `juridico-dados-privacidade-avancado` | **N/A** | Zero dados pessoais processados |
| `juridico-trabalho-digital` | **N/A** | Sem relacao de trabalho formal |
| `juridico-fontes-dados` | PARCIAL | Catalogo de hinos vem de fontes externas (sda-hymnal, SacCentral) |
| `juridico-crypto-blockchain` | **N/A** | Sem cripto/blockchain |

## Riscos Criticos (Top 5)

### 1. Direitos Autorais Musicais (MODERADO)
O app projeta letras e executa playback de hinos. Lei 9.610/98 Art. 46 XI possui excecao para utilizacao em atos religiosos, mas a **distribuicao de arquivos de audio** no catalogo pode nao estar coberta pela excecao. Ver detalhes em `direitos-autorais-musicais.md`.

### 2. Isencao de Garantia (BAIXO)
App e gratuito e MIT. EULA precisa deixar claro que o software e fornecido "AS IS" — sem garantia de funcionamento durante culto ao vivo. Sem essa clausula, usuario pode exigir responsabilidade por "dano moral" por projecao que falhou.

### 3. YouTube Embeds (BAIXO-MODERADO)
App usa YouTube embed para projecao. Google pode remover videos a qualquer momento. EULA precisa declarar que nao controlamos disponibilidade de conteudo terceiro.

### 4. Dependencias Open Source (BAIXO)
Projeto MIT com 30 deps. Nenhuma dep GPL/AGPL identificada (todas permissivas: MIT/BSD/Apache). Mas verificar a cada nova dep adicionada — AGPL trap e o risco principal.

### 5. Marca "LouvorJA" (BAIXO)
Nome nao registrado no INPI. Alguem pode registrar antes. Recomendacao: registro de marca nas classes 9 (software) e 42 (servicos de software).

## Checklist de Implementacao

### Antes da proxima release
- [ ] Incluir EULA no installer (dialogo "Aceitar" obrigatorio)
- [ ] Adicionar link da EULA no README do repo
- [ ] Verificar SPDX identifier no package.json (`"license": "MIT"`)
- [ ] Auditar novas dependencias (npm audit + license-checker)
- [ ] Confirmar que nenhuma dep GPL/AGPL foi adicionada

### Antes de monetizar (se um dia)
- [ ] Revisar EULA para incluir termos de pagamento
- [ ] Ativar `juridico-consumidor-saas` (CDC Art. 49 — arrependimento 7 dias)
- [ ] Ativar `juridico-tributario-pj-saas` (Simples Nacional, NFS-e)
- [ ] Registrar marca "LouvorJA" no INPI
- [ ] Revisar direitos autorais musicais (excecao religiosa nao cobre uso comercial)

### Antes de receber receita internacional (USD)
- [ ] Ativar `juridico-saas-internacional` (LLC Wyoming, MoR)
- [ ] Ativar `juridico-dados-privacidade-avancado` (GDPR, SCCs)

## Revisoes

- **Frequencia**: Anual ou a cada release major
- **Gatilhos para revisao imediata**: adicao de login/contas, telemetria, pagamentos, nova fonte de audio, nova dep GPL/AGPL
- **Proxima revisao**: 2026-08 (apos aprovacao do Ezequias)

## Limitacao

Estes documentos sao first-pass gerados por agentes AI com skills juridicas. Para pontos criticos (direitos autorais musicais com ECAD, registro de marca INPI), consulte um advogado OAB. Custo estimado: R$ 2k-5k pacote completo.
