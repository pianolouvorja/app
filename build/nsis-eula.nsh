; NSIS include script — EULA multi-idioma
; Mostra o EULA no idioma selecionado pelo usuário no installer.
; O NSIS não expõe uma macro LANG_PORTUGUESEBR, embora o nome do arquivo
; de idioma seja PortugueseBR.nlf. O LCID do português brasileiro é 1046.

!define LANG_PORTUGUESE_BR 1046
; O compilador NSIS roda a partir do diretório de templates do electron-builder,
; não da raiz do projeto. PROJECT_DIR é injetado pelo electron-builder e mantém
; estes caminhos válidos tanto no Windows do CI quanto no build local.
!define LICENSE_PTBR "${PROJECT_DIR}\electron\legal\eula\pt-BR.txt"
!define LICENSE_EN "${PROJECT_DIR}\electron\legal\eula\en.txt"
!define LICENSE_ES "${PROJECT_DIR}\electron\legal\eula\es.txt"

LicenseLangString LicenseFile ${LANG_PORTUGUESE_BR} "${LICENSE_PTBR}"
LicenseLangString LicenseFile ${LANG_ENGLISH} "${LICENSE_EN}"
LicenseLangString LicenseFile ${LANG_SPANISH} "${LICENSE_ES}"
