/**
 * Resolve o locale do SO para um dos idiomas suportados pelo app.
 * Usa app.getLocale() (BCP-47) e faz fallback pra pt-BR.
 *
 * @param {string} sysLocale - Locale retornado por app.getLocale().
 * @returns {'pt-BR' | 'en' | 'es'} Locale suportado.
 */
export function resolveAppLocale(sysLocale) {
	const supported = ['pt-BR', 'en', 'es']

	// Match exato (ex: "pt-BR")
	if (supported.includes(sysLocale)) return sysLocale

	// Match por prefixo de idioma (ex: "pt-PT" → "pt-BR", "en-GB" → "en")
	const lang = sysLocale.split('-')[0].toLowerCase()
	const byPrefix = supported.find((s) => s.split('-')[0].toLowerCase() === lang)
	if (byPrefix) return byPrefix

	// Fallback padrão
	return 'pt-BR'
}
