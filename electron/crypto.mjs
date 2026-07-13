import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/** Ofuscação local de JSON em disco (não é criptografia de alta segurança). */
const ENCRYPTION_KEY = Buffer.from('v389s8dkj238910s8a7d3h2j1k9s8d7f', 'utf8')
const IV_LENGTH = 16

/**
 * @param {string} text
 * @returns {string | null}
 */
export function obfuscateText(text) {
  try {
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return `${iv.toString('hex')}:${encrypted}`
  } catch (error) {
    console.error('[workspace] falha ao ofuscar dados', error)
    return null
  }
}

/**
 * @param {string} text
 * @returns {string | null}
 */
export function revealText(text) {
  try {
    const textParts = text.split(':')
    if (textParts.length !== 2) return null
    const iv = Buffer.from(textParts[0], 'hex')
    const encryptedText = Buffer.from(textParts[1], 'hex')
    const decipher = createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
    let decrypted = decipher.update(encryptedText, undefined, 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('[workspace] falha ao revelar dados', error)
    return null
  }
}
