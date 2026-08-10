; NSIS include script — EULA multi-idioma
; Mostra o EULA no idioma selecionado pelo usuário no installer
; Os caminhos são resolvidos pelo electron-builder relativo à raiz do projeto

!define LICENSE_PTBR "electron\legal\eula\pt-BR.txt"
!define LICENSE_EN "electron\legal\eula\en.txt"
!define LICENSE_ES "electron\legal\eula\es.txt"

LicenseLangString LicenseFile ${LANG_PORTUGUESEBR} "${LICENSE_PTBR}"
LicenseLangString LicenseFile ${LANG_ENGLISH} "${LICENSE_EN}"
LicenseLangString LicenseFile ${LANG_SPANISH} "${LICENSE_ES}"
