import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('windows-shared-acl', () => {
  let platformSpy
  let spawnSync
  let mkdirSync

  beforeEach(async () => {
    vi.resetModules()
    platformSpy = vi.spyOn(process, 'platform', 'get').mockReturnValue('win32')
    const childProcess = await import('node:child_process')
    const fs = await import('node:fs')
    spawnSync = vi.spyOn(childProcess, 'spawnSync').mockReturnValue({ status: 0 })
    mkdirSync = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {})
  })

  afterEach(() => {
    platformSpy.mockRestore()
    vi.restoreAllMocks()
  })

  it('chama icacls com SID do grupo Users no Windows', async () => {
    const { ensureWindowsSharedFolderAcl } = await import('../windows-shared-acl.mjs')
    ensureWindowsSharedFolderAcl('C:\\ProgramData\\LouvorJA-PIANO')

    expect(mkdirSync).toHaveBeenCalledWith('C:\\ProgramData\\LouvorJA-PIANO', { recursive: true })
    expect(spawnSync).toHaveBeenCalledWith(
      expect.stringContaining('icacls.exe'),
      [
        'C:\\ProgramData\\LouvorJA-PIANO',
        '/grant',
        '*S-1-5-32-545:(OI)(CI)M',
        '/T',
        '/C',
      ],
      expect.objectContaining({ windowsHide: true }),
    )
  })

  it('não faz nada fora do Windows', async () => {
    platformSpy.mockReturnValue('linux')
    const { ensureWindowsSharedFolderAcl } = await import('../windows-shared-acl.mjs')
    ensureWindowsSharedFolderAcl('C:\\ProgramData\\LouvorJA-PIANO')
    expect(spawnSync).not.toHaveBeenCalled()
  })
})
