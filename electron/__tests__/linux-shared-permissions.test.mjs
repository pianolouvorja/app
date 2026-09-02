import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  chmodSync: vi.fn(),
  mkdirSync: vi.fn(),
  statSync: vi.fn(() => ({ mode: 0o755 })),
  platform: 'linux',
}))

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    chmodSync: (...args) => mocks.chmodSync(...args),
    mkdirSync: (...args) => mocks.mkdirSync(...args),
    statSync: (...args) => mocks.statSync(...args),
  }
})

describe('linux-shared-permissions', () => {
  let platformSpy

  beforeEach(() => {
    vi.clearAllMocks()
    platformSpy = vi.spyOn(process, 'platform', 'get').mockReturnValue(mocks.platform)
  })

  afterEach(() => {
    platformSpy.mockRestore()
  })

  it('cria pasta e aplica modo 2775 no Linux', async () => {
    const { ensureLinuxSharedFolderPermissions, LINUX_SHARED_DIR_MODE } = await import(
      '../linux-shared-permissions.mjs'
    )

    ensureLinuxSharedFolderPermissions('/var/lib/LouvorJA-PIANO')

    expect(mocks.mkdirSync).toHaveBeenCalledWith('/var/lib/LouvorJA-PIANO', { recursive: true })
    expect(mocks.chmodSync).toHaveBeenCalledWith('/var/lib/LouvorJA-PIANO', LINUX_SHARED_DIR_MODE)
  })

  it('ignora em plataformas que não são Linux', async () => {
    mocks.platform = 'win32'
    platformSpy.mockReturnValue('win32')

    const { ensureLinuxSharedFolderPermissions } = await import('../linux-shared-permissions.mjs')

    ensureLinuxSharedFolderPermissions('/var/lib/LouvorJA-PIANO')

    expect(mocks.mkdirSync).not.toHaveBeenCalled()
    expect(mocks.chmodSync).not.toHaveBeenCalled()
  })
})
