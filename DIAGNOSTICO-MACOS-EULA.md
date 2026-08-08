# Diagnóstico do primeiro início no macOS

## Sintomas reproduzidos

1. O primeiro pacote mostrava somente a splash porque os arquivos em
   `docs/LEGAL/eula/` não estavam incluídos no `app.asar`.
2. Depois de incluir `docs/LEGAL/eula/**/*` em `build.files`, o aplicativo
   passou a encerrar imediatamente, sem apresentar uma mensagem de erro.
3. O processo encerrava normalmente, com código `0`, e não gerava relatório de
   crash do macOS.

## Causa do encerramento

O arquivo do EULA passou a ser encontrado corretamente. Em seguida,
`dialog.showMessageBoxSync()` devolveu `-1001` no macOS sem apresentar o alerta.
O fluxo considerava qualquer valor diferente de `0` como uma recusa, abria a
confirmação síncrona (que também devolvia `-1001`) e chamava `app.quit()`.

Uma tentativa com `dialog.showMessageBox()` assíncrono fez o alerta aparecer,
mas mostrou outra limitação: o contrato tem aproximadamente 7 mil caracteres e
o alerta nativo ficou maior do que a tela, sem rolagem e sem acesso aos botões.

## Correção adotada

- Os três textos do EULA continuam incluídos no pacote pelo `package.json`.
- O texto longo passou a ser exibido em uma `BrowserWindow` local, com tamanho
  limitado à área útil da tela, redimensionamento, conteúdo rolável e botões
  fixos no rodapé.
- A janela não carrega conteúdo remoto, não possui Node.js no renderer, usa
  isolamento de contexto e sandbox e bloqueia navegação e novas janelas.
- Somente a confirmação curta de recusa continua usando o diálogo nativo.
- A inicialização agora aguarda de forma assíncrona a decisão do usuário.
- Uma falha ao persistir o aceite mantém a janela aberta e mostra um erro.

## Observação sobre a primeira sincronização

O primeiro bootstrap chama `clearWorkspace()`, que remove `.sysdata`. Como o
aceite era gravado em `.sysdata/eula.bin`, ele também era apagado poucos segundos
depois de ser criado. A limpeza agora preserva `eula.bin` (e o formato legado
`eula`), evitando que os termos reapareçam em toda execução.

## Validação sugerida para um pacote novo

1. Gerar o pacote sem usar automaticamente uma identidade Apple pessoal:

   ```sh
   CSC_IDENTITY_AUTO_DISCOVERY=false npm run electron:build -- -c.mac.identity=null
   ```

2. Instalar o DMG correspondente à arquitetura do Mac.
3. No primeiro início, confirmar que a janela do EULA permite rolar,
   redimensionar, voltar da recusa e aceitar.
4. Fechar e abrir novamente o aplicativo e confirmar que o EULA não reaparece.

Um pacote sem assinatura/notarização é adequado apenas para este teste local.
Para distribuição a outros usuários, o aplicativo deve ser assinado com a
identidade do responsável pelo projeto e notarizado pela Apple.
