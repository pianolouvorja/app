; NSIS include script — EULA multi-idioma
; Mostra o EULA no idioma selecionado pelo usuário no installer.
; O NSIS não expõe uma macro LANG_PORTUGUESEBR, embora o nome do arquivo
; de idioma seja PortugueseBR.nlf. O LCID do português brasileiro é 1046.

!define LANG_PORTUGUESE_BR 1046
!define LICENSE_PTBR "electron\legal\eula\pt-BR.txt"
!define LICENSE_EN "electron\legal\eula\en.txt"
!define LICENSE_ES "electron\legal\eula\es.txt"

LicenseLangString LicenseFile ${LANG_PORTUGUESE_BR} "${LICENSE_PTBR}"
LicenseLangString LicenseFile ${LANG_ENGLISH} "${LICENSE_EN}"
LicenseLangString LicenseFile ${LANG_SPANISH} "${LICENSE_ES}"
