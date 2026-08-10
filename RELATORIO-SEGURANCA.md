# Revisão preventiva para a versão multiplataforma do LouvorJA PIANO

Data da revisão: 8 de agosto de 2026  
Versão avaliada: `1.16.0`  
Plataforma do build: macOS Apple Silicon (`arm64`)  
Repositório: `pianolouvorja/app`

## Resumo executivo

Esta revisão foi feita como uma contribuição à nova fase multiplataforma do LouvorJA PIANO. A intenção é ajudar a transformar o build atual em uma distribuição mais segura e previsível no macOS, aproveitando a boa base que já existe no projeto.

O type-check e o build Vite passaram, e o pacote macOS arm64 foi gerado com sucesso sem que o aplicativo precisasse ser aberto durante a análise. A revisão do empacotamento também não encontrou mecanismos adicionais de inicialização automática no macOS nem binários nativos inesperados.

Foram identificadas oportunidades de fortalecimento típicas de aplicações Electron que combinam interface local, conteúdo web externo e acesso ao sistema de arquivos. Os quatro primeiros pontos merecem prioridade antes de uma distribuição ampla: separar páginas externas da ponte privilegiada do Electron, autorizar os chamadores IPC, garantir que caminhos permaneçam dentro das pastas do aplicativo e limitar permissões de captura à janela que realmente precisa delas.

Também vale modernizar a transferência do catálogo, limitar e cancelar downloads corretamente e concluir a cadeia de assinatura/notarização do macOS. Esses são ajustes comuns de segurança cujos limites de confiança ficaram mais importantes com a passagem de uma aplicação web/Windows para um aplicativo desktop multiplataforma.

| Ordem sugerida | Área | Objetivo |
|---|---|---|
| 1 | Conteúdo web e IPC | Impedir que uma página externa receba recursos reservados à interface local |
| 2 | Arquivos locais | Confinar registros e mídias às pastas previstas pelo aplicativo |
| 3 | Permissões | Autorizar câmera, microfone e tela apenas para o componente local correto |
| 4 | Transferências | Proteger catálogo e mídia em trânsito e limitar consumo de memória/disco |
| 5 | Distribuição | Atualizar dependências, endurecer o Electron e assinar/notarizar o app |

## Contexto

A análise abrangeu o código-fonte correspondente à versão `1.16.0` e o snapshot atual de `main`. A única diferença de conteúdo identificada entre eles foi `.github/CODEOWNERS`, que não entra no aplicativo empacotado. Foram revisados o processo principal Electron, o preload, os handlers IPC, a projeção de liturgia, as operações de workspace e mídia, as dependências e o pacote macOS produzido.

Alguns controles importantes já estão presentes:

- as janelas usam `contextIsolation: true` e `nodeIntegration: false`;
- as consultas ao catálogo usam instruções preparadas e parâmetros vinculados;
- os processos externos encontrados usam `execFile` com argumentos separados, sem passar texto livre para um shell;
- os 566 artefatos resolvidos pelo lockfile vêm de `registry.npmjs.org` e possuem campo de integridade;
- o pacote inclui um conjunto explícito de arquivos e recursos, sem binários nativos adicionais inesperados;
- o DMG produzido é estruturalmente válido e o runtime Electron usado no build corresponde ao arquivo oficial verificado por SHA-256.

Os pontos abaixo não anulam essas boas decisões. Eles indicam onde os controles precisam acompanhar a nova superfície de um aplicativo desktop que pode abrir conteúdo remoto e manipular arquivos locais.

## Detalhes dos pontos encontrados

### 1. Separar páginas externas da API privilegiada do aplicativo

**O que acontece hoje.** O recurso de Liturgia aceita endereços HTTP/HTTPS e os abre em janelas Electron configuradas com o mesmo `preload.mjs` usado pela interface local. Esse preload publica `window.louvorja`, com operações de workspace, mídia, catálogo, diálogos, telas e projeção. Os handlers correspondentes não confirmam qual janela ou origem iniciou a chamada.

**Por que vale ajustar.** Uma página externa pode mudar sem que o aplicativo mude: o site pode sofrer uma falha, carregar um script de terceiro ou redirecionar para outro endereço. Nesse caso, o JavaScript remoto passa a receber recursos de desktop que deveriam pertencer apenas à interface local. `contextIsolation` e `nodeIntegration: false` continuam sendo bons controles, mas não removem funções que o próprio preload exporta.

**Onde revisar.** `src/modules/liturgy/services/liturgy-web-runtime.ts:69`, `electron/ipc/web-projection.mjs:748`, `electron/ipc/web-projection.mjs:888`, `electron/preload.mjs:15` e `electron/ipc/register.mjs:52`.

**Sugestão.** Criar uma configuração própria para conteúdo remoto com:

- nenhum preload privilegiado;
- `sandbox: true`, `contextIsolation: true` e `nodeIntegration: false`;
- uma `partition` de sessão separada e não persistente;
- bloqueio de pop-ups e navegações não previstas;
- controles de projeção mantidos numa view local confiável;
- validação, em todo IPC sensível, do `WebContents` esperado e da URL local autorizada.

Se alguma função realmente precisar estar disponível à página externa, é preferível criar um preload remoto mínimo, com uma única operação específica e argumentos validados, em vez de reutilizar `window.louvorja` por inteiro.

**Como confirmar.** Abrir uma página de teste no fluxo de Liturgia e verificar que `window.louvorja` é `undefined`. Em um teste de integração separado, usar um `WebContents` remoto com um preload mínimo exclusivo do teste para tentar chamar um canal privilegiado e confirmar que a autorização do processo principal o rejeita. A interface local e os controles de projeção devem continuar funcionando.

### 2. Confinar os registros do workspace à pasta `.sysdata`

**O que acontece hoje.** As rotinas de leitura e gravação recebem um `filename` e o combinam com a pasta de dados usando `path.join`. Não há rejeição explícita de separadores, caminhos absolutos ou componentes `..`, nem uma conferência final de que o caminho resolvido permaneceu sob `.sysdata`.

**Por que vale ajustar.** Um nome inesperado pode fazer a operação alcançar um arquivo fora da pasta prevista. A rotina de migração de registros antigos também grava um arquivo irmão e remove o original, aumentando o efeito de um caminho incorreto.

**Onde revisar.** `electron/workspace.mjs:28-72` e os handlers de workspace em `electron/ipc/register.mjs:336-359`.

**Sugestão.** Substituir nomes livres por chaves conhecidas, por exemplo `settings`, `catalog` e demais registros aceitos pelo produto. Uma função central deve mapear cada chave para um arquivo fixo. Como defesa adicional, ela pode usar `path.resolve` e `path.relative` para a contenção lexical, rejeitando caminhos absolutos, `..`, separadores e byte NUL. Para leituras e remoções, deve conferir também o caminho real com `realpath`; para gravações, validar o diretório-pai real e abrir o arquivo sem seguir links simbólicos quando a plataforma permitir.

**Como confirmar.** Manter testes para todas as chaves válidas e casos negativos como `../teste`, `a/../../teste`, caminhos absolutos e variantes codificadas. Todos os casos negativos devem falhar antes de qualquer leitura, gravação ou remoção.

### 3. Aplicar a mesma contenção aos arquivos de mídia

**O que acontece hoje.** `media.download`, `media.check` e `media.delete` decodificam o nome recebido e o juntam à pasta de mídia, mas não validam o caminho resultante. Um `mediaType` desconhecido também termina na pasta padrão de capas.

**Por que vale ajustar.** O nome da mídia pode vir da interface, do catálogo ou de uma página que tenha acesso à ponte. Um caminho fora do formato esperado pode fazer as rotinas verificar, criar, sobrescrever ou remover um arquivo fora da biblioteca de mídia.

**Onde revisar.** `electron/workspace.mjs:227-320`, `electron/paths.mjs:89-95` e `electron/ipc/register.mjs:383-390`.

**Sugestão.** Aceitar em runtime somente os tipos de mídia previstos e definir uma gramática estrita para caminhos relativos. Depois de decodificar uma única vez, resolver o caminho contra a raiz do tipo e exigir que `path.relative(root, candidate)` não seja absoluto nem comece por `..`. Para arquivos existentes, conferir também a contenção dos caminhos reais com `realpath`. Para gravações, validar o diretório-pai real, usar arquivo temporário exclusivo sem seguir symlinks quando possível e fazer `rename` atômico somente após a validação.

**Como confirmar.** Testar nomes normais e também `../`, separadores codificados, caminhos absolutos, tipo de mídia desconhecido e um symlink que aponta para fora da biblioteca. Nenhum caso inválido deve consultar ou modificar o destino externo.

### 4. Limitar permissões de captura à janela local correta

**O que acontece hoje.** Um handler instalado em `session.defaultSession` aprova solicitações de mídia e captura de tela sem conferir a origem ou a janela solicitante. As páginas externas de projeção usam essa mesma sessão.

**Por que vale ajustar.** O macOS ainda controla a autorização inicial do aplicativo, mas, depois de concedida, o sistema operacional não separa a interface local confiável de cada página remota carregada dentro do mesmo Electron. Essa separação precisa ser feita pelo próprio aplicativo.

**Onde revisar.** `electron/ipc/web-projection.mjs:2137-2150` e a criação das janelas em `electron/ipc/web-projection.mjs:748-1042`.

**Sugestão.** Usar uma sessão própria para páginas remotas e negar nela câmera, microfone e `display-capture`. Na sessão confiável, aprovar somente o `WebContents` exato da página local de espelhamento, conferindo também sua URL/protocolo. Os handlers de solicitação e de verificação de permissão devem aplicar a mesma regra.

**Como confirmar.** Com a permissão do macOS já concedida ao app, a página local de espelhamento deve conseguir capturar apenas o recurso previsto, enquanto uma página HTTP/HTTPS projetada deve receber negação sem novo acesso à câmera, ao microfone ou à tela.

### 5. Modernizar a transferência do catálogo e da mídia de fallback

**O que acontece hoje.** O catálogo e a mídia de fallback usam `basic-ftp` com `secure: false`. Existe uma comparação opcional de tamanho para decidir se um arquivo já baixado pode ser reaproveitado, mas não há uma verificação pós-download consistente nem uma assinatura ou hash obtido por uma fonte independente antes de o banco ser aberto.

**Por que vale ajustar.** FTP simples não oferece criptografia nem autenticação do conteúdo em trânsito. Em redes compartilhadas ou intermediadas, isso expõe as credenciais da transferência e permite que dados recebidos sejam alterados antes de chegarem aos parsers locais.

**Onde revisar.** `electron/ftp.mjs:12-55` e `electron/workspace.mjs:83-159`, `192-219`.

**Sugestão.** Preferir HTTPS autenticado para catálogo e mídias. Publicar junto um manifesto versionado, assinado, com tamanho e SHA-256 de cada artefato; verificar o manifesto antes de abrir ou mover os arquivos para o local definitivo. Se a migração precisar ser gradual, usar FTPS com validação de certificado ou SFTP, sem fallback silencioso para FTP, e credenciais somente de leitura e escopo limitado.

**Como confirmar.** Uma alteração de um byte no catálogo deve impedir sua instalação. Certificado inválido, manifesto ausente, hash divergente ou versão de esquema não suportada devem falhar de forma segura, preservando o catálogo anterior.

### 6. Fazer downloads com streaming, limites e cancelamento real

**O que acontece hoje.** O caminho HTTP usa `response.arrayBuffer()`, mantém a resposta inteira em memória, cria outro `Buffer` e faz uma gravação síncrona. O timeout usa `Promise.race`, mas não cancela o `fetch` nem a transferência FTP; o trabalho pode continuar depois de a interface já ter recebido um erro. O fallback do protocolo local repete o buffer completo sem limite de tamanho.

**Por que vale ajustar.** Um arquivo muito grande, uma resposta que nunca termina ou várias transferências simultâneas podem consumir memória, espaço em disco e tempo do processo principal, além de deixar arquivos parciais.

**Onde revisar.** `electron/workspace.mjs:207-284`, `electron/protocol.mjs:54-70` e `electron/ipc/register.mjs:383-390`.

**Sugestão.** Transmitir os bytes para um arquivo temporário enquanto se conta o tamanho; definir limites por tipo, quota total e concorrência global; conectar o timeout a `AbortController` e ao encerramento do cliente FTP; apagar arquivos parciais; e promover o arquivo por `rename` atômico somente após a validação de tamanho, tipo e integridade.

**Como confirmar.** Usar respostas de teste acima do limite, lentas, interrompidas e com tamanho anunciado incorreto. O consumo de memória deve permanecer estável, a conexão deve ser realmente fechada no timeout e nenhum arquivo parcial deve aparecer como mídia válida.

## Análise de impacto e prioridade

Os pontos 1 a 4 formam um mesmo limite de confiança e, por isso, funcionam melhor quando corrigidos em conjunto. A página externa precisa ficar sem a API privilegiada; os handlers IPC devem recusar remetentes não autorizados mesmo assim; os caminhos precisam ser seguros mesmo quando o chamador é legítimo; e as permissões devem pertencer somente ao componente local que as utiliza.

A sequência mais eficiente parece ser:

1. introduzir um construtor de janela remota isolada e testes que confirmem a ausência de `window.louvorja`;
2. criar uma função central de autorização IPC e aplicá-la primeiro às operações destrutivas e de arquivos;
3. criar resolvedores seguros e únicos para workspace e mídia, com testes de contenção;
4. separar as sessões e implementar uma política de permissões por `WebContents`;
5. substituir FTP e acrescentar autenticidade dos artefatos;
6. refatorar downloads para streaming limitado e cancelável;
7. concluir o hardening e a cadeia de distribuição do macOS.

Para testes internos antes dessas mudanças, é prudente manter o recurso de site externo desabilitado, negar permissões de captura e usar apenas dados descartáveis numa conta ou máquina virtual de teste.

## Validação realizada

A validação foi predominantemente estática e de empacotamento. Eu revisei diretamente o código-fonte e os artefatos do build, mas não executei páginas de demonstração nem abri o aplicativo. Portanto, os fluxos descritos acima são confirmados pelo encadeamento do código; não estou apresentando uma exploração executada.

Também foram verificados:

- type-check e build Vite concluídos;
- geração de `.app` e DMG arm64 sem iniciar o aplicativo;
- correspondência do runtime Electron 43.1.0 com seu checksum oficial;
- conteúdo próprio do `app.asar` compatível com os arquivos revisados;
- integridade estrutural do DMG;
- ausência, no código próprio revisado, de mecanismos adicionais de inicialização automática no macOS, acesso ao Keychain ou binários nativos adicionais inesperados.

O `npm audit` registrou 9 ocorrências, sendo 8 altas e 1 média, sem críticas. Duas aparecem na árvore classificada como produção: `nanoid` 3.3.16 e `postcss` 8.5.17. Não foi localizado um fluxo do aplicativo que alcance as funções afetadas, e ambas parecem ligadas ao ferramental Vite/Vue. Ainda assim, vale atualizar o conjunto e evitar empacotar no ASAR bibliotecas necessárias apenas durante a compilação.

## Recomendações

Além das seis correções funcionais, o build macOS precisa de acabamento de distribuição:

- assinar o `.app` com Developer ID e hardened runtime;
- configurar apenas os entitlements realmente necessários;
- notarizar o artefato e anexar o ticket com `stapler`;
- assinar o DMG e publicar seu SHA-256;
- configurar os Electron fuses de produção, desabilitando `RunAsNode`, `NODE_OPTIONS` e argumentos de inspeção, e habilitando a validação incorporada do ASAR e `OnlyLoadAppFromAsar` após testes de compatibilidade;
- atualizar dependências e separar claramente dependências de build das dependências de runtime;
- gerar o artefato publicado em CI a partir de um lockfile imutável, com scripts e ações fixados e revisados.

A falta atual de assinatura e notarização é compatível com um build local de teste; ela apenas significa que o pacote ainda não é um instalador pronto para usuários finais. Como critérios de aceite da versão de distribuição, podem ser usados:

```sh
codesign --verify --deep --strict --verbose=2 "louvorja-piano.app"
spctl --assess --type execute --verbose=4 "louvorja-piano.app"
xcrun stapler validate "louvorja-piano.app"
hdiutil verify "LouvorJA-PIANO-1.16.0-arm64-UNSIGNED.dmg"
npm audit --omit=dev
```

O objetivo não precisa ser simplesmente obter zero alertas do `npm audit`; o mais importante é atualizar o que for alcançável em runtime, remover do pacote o que é apenas ferramenta de build e documentar qualquer exceção temporária.

## Resumo final

O projeto tem uma base técnica sólida e várias escolhas corretas. O principal ganho agora é tornar explícita a fronteira entre a interface local confiável e o conteúdo web externo. Corrigindo em conjunto o preload das janelas remotas, a autorização IPC, a contenção de caminhos e o escopo das permissões, o aplicativo elimina os riscos mais relevantes identificados nesta revisão.

Na sequência, HTTPS com integridade independente, downloads limitados/canceláveis e uma cadeia macOS assinada e notarizada deixam a distribuição mais robusta e mais simples de testar. Recomendo tratar este documento como uma lista colaborativa de melhorias, dividida em pequenas alterações com testes de regressão, e repetir a revisão depois da implementação.
