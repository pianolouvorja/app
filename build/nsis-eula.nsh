; NSIS include script — EULA multi-idioma
; Mostra o EULA no idioma selecionado pelo usuário no installer.
; O NSIS não expõe uma macro LANG_PORTUGUESEBR, embora o nome do arquivo
; de idioma seja PortugueseBR.nlf. O LCID do português brasileiro é 1046.

!define LANG_PORTUGUESE_BR 1046
!define LANG_ENGLISH_US 1033
!define LANG_SPANISH_ES 3082
; O compilador NSIS roda a partir do diretório de templates do electron-builder,
; não da raiz do projeto. PROJECT_DIR é injetado pelo electron-builder e mantém
; estes caminhos válidos tanto no Windows do CI quanto no build local.
!define LICENSE_PTBR "${PROJECT_DIR}\electron\legal\eula\pt-BR.txt"
!define LICENSE_EN "${PROJECT_DIR}\electron\legal\eula\en.txt"
!define LICENSE_ES "${PROJECT_DIR}\electron\legal\eula\es.txt"

LicenseLangString LicenseFile ${LANG_PORTUGUESE_BR} "${LICENSE_PTBR}"
LicenseLangString LicenseFile ${LANG_ENGLISH_US} "${LICENSE_EN}"
LicenseLangString LicenseFile ${LANG_SPANISH_ES} "${LICENSE_ES}"

; Padrão: instalar para todos os usuários (Program Files).
; Alternativa na mesma tela: só o usuário atual (LocalAppData, sem admin).
!macro preInit
  SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$PROGRAMFILES64/louvorja-piano"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$LOCALAPPDATA/Programs/louvorja-piano"
!macroend

; Dados compartilhados (mídias, catálogo) entre perfis do Windows em ProgramData.
; S-1-5-32-545 = grupo Users (funciona em qualquer idioma do SO).
!macro customInstall
  ReadEnvStr $0 PROGRAMDATA
  CreateDirectory "$0/LouvorJA-PIANO"
  ExecWait '"$WINDIR\System32\icacls.exe" "$0/LouvorJA-PIANO" /grant *S-1-5-32-545:(OI)(CI)M /T' $1
!macroend
