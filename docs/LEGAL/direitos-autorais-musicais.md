# Analise de Risco — Direitos Autorais Musicais

**LouvorJA Piano** — Projecao de Hinos em Cultos Religiosos

Versao: 1.0 | Data: 07 de agosto de 2026

---

## 1. Cenario

O app LouvorJA Piano realiza as seguintes atividades com obras musicais:

1. **Projeção de letras** de hinos (obra literaria/musical composta).
2. **Execucao de playback/audio** de hinos (obra fonografica — gravacao).
3. **YouTube embeds** para projecao de videos com hinos.
4. **Distribuicao indireta** de arquivos de audio via catalogo (links para fontes externas).

Publico-alvo: Igrejas Adventistas do Setimo Dia em todo Brasil. Uso exclusivamente religioso, sem fins lucrativos, sem cobranca de ingresso.

## 2. Lei 9.610/98 — Direitos Autorais

A Lei 9.610/98 protege:

- **Obra musical (composicao/melodia)**: Art. 7, VI.
- **Obra literaria (letra)**: Art. 7, I.
- **Obra fonografica (gravacao/som fixado)**: Art. 5, XX.
- **Direito de execucao publica**: Art. 29, III.
- **Direito de distribuicao**: Art. 29, VI.
- **Direito de comunicacao ao publico**: Art. 5, II e Art. 29.

Sem licenca ou excecao legal, qualquer destes usos requer autorizacao previa e expressa do titular.

## 3. Excecao Religiosa

### CF/88 Art. 5, VI

> "e inviolavel a liberdade de consciencia e de crenca, sendo assegurado o livre exercicio dos cultos religiosos e garantida, na forma da lei, a protecao aos locos de cerimonia religiosa e seus liturgicos."

### Lei 9.610/98 Art. 46, XI

> "nao constitui ofensa aos direitos autorais [...] a utilizacao de obras literarias, artisticas ou cientificas, fonogramas e transmissao de radio e televisao em cultos religiosos, desde que [...] sem intuito de lucro."

### Interpretaçao

A excecao religiosa (Art. 46 XI) cobre:

- Execucao de musicas durante o culto (obra musical + fonograma).
- Projeção de letras durante o culto (obra literaria).
- Execucao de playback/audio durante o culto (fonograma).

**Condicoes para aplicabilidade:**

1. **Dentro do culto**: O uso deve ocorrer durante cerimonia religiosa, nao fora dela.
2. **Sem intuito de lucro**: Nao pode haver cobranca de ingresso, mensalidade especifica para o evento musical, ou fim comercial.

### Conclusao sobre Excecao Religiosa

O uso do app **dentro de cultos** (projeção + playback) esta **amparado** pela excecao do Art. 46 XI da Lei 9.610/98, desde que sem intuito de lucro.

## 4. Riscos Especificos

### 4a. Projeção de Letras (Obra Literaria) em Culto

**Risco: BAIXO**

- Excecao religiosa (Art. 46 XI) cobre projeção de obras literarias em cultos sem fins lucrativos.
- Risco surge se a projeção ocorrer **fora do culto** (ensaio aberto ao publico, evento social, transmissao online para nao-membros).

### 4b. Execucao de Playback/Audio (Obra Fonografica) em Culto

**Risco: BAIXO**

- Art. 46 XI cobre expressamente "fonogramas" em cultos religiosos sem lucro.
- O app executa playback a partir de arquivos locais ou streaming de fontes externas — ambos cobertos pela excecao durante o culto.

### 4c. YouTube Embeds

**Risco: BAIXO-MODERADO**

- YouTube opera sob suas proprias licencas com titulares de direitos. Ao incorporar (embed) um video, a responsabilidade pela gestao de direitos e primariamente do YouTube/Google.
- Plataforma de UGC (user-generated content) tem safe harbor (Marco Civil da Internet, Lei 12.965/14, Art. 19).
- Risco: Se o video for removido por infracao de copyright apos ser incorporado no app, o app exibira erro de reproducao. Nao constitui infracao pelo app, mas gera experiencia negativa.
- **Recomendacao**: Usar apenas videos oficiais ou com licenca explicita quando possivel.

### 4d. Distribuicao de Arquivos de Audio no Catalogo

**Risco: MODERADO**

Este e o ponto mais sensivel. O app baixa arquivos de audio de fontes externas:

| Fonte | Conteudo | Risco |
|---|---|---|
| API LouvorJA (propria) | Hinos da colecao LouvorJA | Baixo (obra propria ou licenciada) |
| sda-hymnal (NPM) | Hinario Adventista (letras) | Baixo (dominio publico ou licenca aberta) |
| SacCentral (bjaarmy.com) | 483 MP3 coral (inglés) | Moderado (sem licenca explicita de redistribuicao) |
| MIDI frazras | 695 MIDI (GPL) | Baixo (GPL permite redistribuicao) |

**Problema central**: A excecao religiosa (Art. 46 XI) cobre **execucao em culto**, mas **NAO cobre distribuicao/redisribuicao** de fonogramas. Baixar e armazenar arquivos de audio de terceiros no catalogo do app constitui ato de distribuicao (Art. 29, VI), que requer licenca do produtor fonografico.

Para a **colecao LouvorJA** (obra propria do projeto), nao ha problema. Para fonogramas de terceiros (SacCentral, etc.), e necessario:

1. Verificar se a fonte possui licenca que permite redistribuicao.
2. Caso contrario, obter licenca do produtor fonografico.
3. Ou limitar o catalogo a obras em dominio publico ou com licenca aberta (Creative Commons, GPL).

## 5. ECAD

### Obrigatoriedade Geral

O ECAD (Escritorio Central de Arrecadacao e Distribuicao) arrecada direitos de execucao publica de obras musicais. Estabelecimentos comerciais (restaurantes, radios, TVs) devem pagar ao ECAD.

### Aplicabilidade a Igrejas

**Igrejas nao pagam ECAD para musicas executadas em cultos**, pois:

1. Art. 46 XI da Lei 9.610/98 isenta expressamente o uso em cultos religiosos sem fins lucrativos.
2. CF/88 Art. 5, VI garante livre exercicio de cultos.

### Excecoes (quando ECAD pode cobrar)

- Eventos sociais da igreja com cobranca de ingresso (jantar, show beneficente).
- Transmissao online de cultos para publico pago.
- Radio/TV da igreja que executa musicas comerciais.

O app LouvorJA, usado exclusivamente em cultos, **nao exige pagamento ao ECAD**.

## 6. Recomendacoes Praticas

1. **Documentar fontes**: Manter registro da origem e licenca de cada arquivo de audio no catalogo. Para cada hino: fonte, licenca, data de obtencao.

2. **Atribuicao**: Exibir creditos do autor/compositor e da fonte do audio na interface do app (tela "Sobre" ou "Creditos").

3. **Preferir dominio publico e CC**: Priorizar obras em dominio publico (hinarios antigos, composicoes pre-1926 nos EUA) e Creative Commons para o catalogo de audio.

4. **Evitar redistribuicao nao autorizada**: Para fontes como SacCentral, obter permissao por escrito ou substituir por fonte com licenca explicita de redistribuicao.

5. **Aviso no app**: Incluir aviso de que o uso do app deve respeitar a excecao religiosa do Art. 46 XI — uso em cultos sem fins lucrativos. Uso fora deste contexto pode requerer licenciamento.

6. ** nao incluir obras de autores recusantes**: Alguns autores (ex: alguns compositores gospel comerciais) podem nao autorizar uso mesmo em cultos. Verificar lista de autores antes de adicionar ao catalogo.

7. **Transmissoes online**: Se a igreja transmitir o culto online (YouTube, Facebook Live), a excecao religiosa pode nao cobrir integralmente — plataformas podem aplicar Content ID e monetizar/abater o conteudo. Recomendacao: desabilitar audio da transmissao durante musicas protegidas, ou usar apenas obras dominio publico/CC.

## 7. Conclusao e Nivel de Risco

| Atividade | Risco | Justificativa |
|---|---|---|
| Projeção de letras em culto | **BAIXO** | Art. 46 XI cobre |
| Execucao de playback em culto | **BAIXO** | Art. 46 XI cobre fonogramas |
| YouTube embed | **BAIXO-MODERADO** | Safe harbor Marco Civil + responsabilidade YouTube |
| Distribuicao de audio (catalogo) | **MODERADO** | Art. 46 XI NAO cobre distribuicao — licencas necessarias |
| ECAD | **N/A** | Cultos religiosos isentos |

### Risco Global: **BAIXO-MODERADO**

O uso do app em cultos religiosos sem fins lucrativos esta bem amparado pela excecao do Art. 46 XI. O unico ponto de atencao e a **distribuicao de fonogramas** no catalogo — verificar licencas das fontes externas (SacCentral principalmente) e obter permissao ou substituir.

---

**Aviso Legal**: Esta analise e first-pass AI baseada na legislacao brasileira vigente. Para validacao definitiva sobre direitos autorais musicais e ECAD, consulte um advogado especialista em direito autoral inscrito na OAB.
