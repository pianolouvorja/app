// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { useUpdateChecker } from '../useUpdateChecker'

describe('useUpdateChecker (SSR / no-window)', () => {
  it('checkForUpdates não falha sem window', async () => {
    const { checkForUpdates, hasUpdate } = useUpdateChecker()
    await checkForUpdates()
    expect(hasUpdate.value).toBe(false)
  })

  it('downloadUpdate não falha sem window', async () => {
    const result = useUpdateChecker()
    result.hasUpdate.value = true
    await result.downloadUpdate()
    // Sem API disponível, não deve fazer nada nem quebrar
    expect(result.isDownloading.value).toBe(false)
  })

  it('installUpdate não falha sem window', () => {
    const result = useUpdateChecker()
    result.isDownloaded.value = true
    result.installUpdate()
    // Sem crash
  })

  it('init não registra listeners sem window', () => {
    const { init } = useUpdateChecker()
    init()
    // Sem crash, sem listeners
  })

  it('dismiss não falca sem sessionStorage (SSR)', () => {
    const { dismiss, dismissed } = useUpdateChecker()
    dismiss()
    expect(dismissed.value).toBe(true)
  })
})
