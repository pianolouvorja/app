import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  appData: '/home/user/.config',
  exe: 'C:\\Program Files\\louvorja-piano\\louvorja-piano.exe',
  existsSync: vi.fn(),
  readdirSync: vi.fn(() => []),
  mkdirSync: vi.fn(),
  renameSync: vi.fn(),
  cpSync: vi.fn(),
  writeFileSync: vi.fn(),
  rmSync: vi.fn(),
  platform: 'linux',
}))

vi.mock('../windows-shared-acl.mjs', () => ({
  ensureWindowsSharedFolderAcl: vi.fn(),
}))

vi.mock('../linux-shared-permissions.mjs', () => ({
  ensureLinuxSharedFolderPermissions: vi.fn(),
}))

vi.mock('../macos-shared-permissions.mjs', () => ({
  ensureMacSharedFolderPermissions: vi.fn(),
}))

vi.mock('electron', () => ({
  app: {
    getPath: (name) => {
      if (name === 'appData') return mocks.appData
      if (name === 'exe') return mocks.exe
      throw new Error(`unexpected getPath: ${name}`)
    },
    setPath: vi.fn(),
  },
}))

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    existsSync: (...args) => mocks.existsSync(...args),
    readdirSync: (...args) => mocks.readdirSync(...args),
    mkdirSync: (...args) => mocks.mkdirSync(...args),
    renameSync: (...args) => mocks.renameSync(...args),
    cpSync: (...args) => mocks.cpSync(...args),
    writeFileSync: (...args) => mocks.writeFileSync(...args),
    rmSync: (...args) => mocks.rmSync(...args),
  }
})

import { ensureLinuxSharedFolderPermissions } from '../linux-shared-permissions.mjs'
import { ensureMacSharedFolderPermissions } from '../macos-shared-permissions.mjs'
import { ensureWindowsSharedFolderAcl } from '../windows-shared-acl.mjs'
import {
  configureUserDataPath,
  migrateLegacyUserDataIfNeeded,
  resolveLegacyLinuxElectronUserDataPaths,
  resolveLegacyMacElectronUserDataPaths,
  resolveLegacyPerUserRoamingPath,
  resolveLegacyProgramFilesDataPath,
  resolveLinuxSharedUserDataPath,
  resolveMacSharedUserDataPath,
  resolveUserDataPath,
  resolveWindowsSharedUserDataPath,
} from '../user-data-path.mjs'
import { app } from 'electron'

describe('user-data-path', () => {
  let platformSpy

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.existsSync.mockReturnValue(false)
    mocks.readdirSync.mockReturnValue([])
    platformSpy = vi.spyOn(process, 'platform', 'get').mockReturnValue(mocks.platform)
  })

  afterEach(() => {
    platformSpy.mockRestore()
    delete process.env.APPDATA
    delete process.env.ProgramData
  })

  it('resolveUserDataPath no Windows empacotado usa ProgramData', () => {
    mocks.platform = 'win32'
    platformSpy.mockReturnValue('win32')
    process.env.ProgramData = 'C:\\ProgramData'

    expect(resolveUserDataPath({ isDev: false })).toBe(
      path.win32.join('C:\\ProgramData', 'LouvorJA-PIANO'),
    )
  })

  it('resolveWindowsSharedUserDataPath usa ProgramData', () => {
    process.env.ProgramData = 'D:\\ProgramData'
    expect(resolveWindowsSharedUserDataPath()).toBe('D:\\ProgramData\\LouvorJA-PIANO')
  })

  it('resolveUserDataPath no Windows em dev mantém appData per-user', () => {
    mocks.platform = 'win32'
    platformSpy.mockReturnValue('win32')

    expect(resolveUserDataPath({ isDev: true })).toBe(
      path.join(mocks.appData, 'LouvorJA-PIANO'),
    )
  })

  it('resolveUserDataPath no Linux empacotado usa /var/lib', () => {
    mocks.platform = 'linux'
    platformSpy.mockReturnValue('linux')

    expect(resolveUserDataPath({ isDev: false })).toBe('/var/lib/LouvorJA-PIANO')
    expect(resolveLinuxSharedUserDataPath()).toBe('/var/lib/LouvorJA-PIANO')
  })

  it('resolveUserDataPath no Linux em dev mantém appData per-user', () => {
    mocks.platform = 'linux'
    platformSpy.mockReturnValue('linux')

    expect(resolveUserDataPath({ isDev: true })).toBe(
      path.join(mocks.appData, 'LouvorJA-PIANO'),
    )
  })

  it('resolveUserDataPath no macOS empacotado usa /Users/Shared', () => {
    mocks.platform = 'darwin'
    platformSpy.mockReturnValue('darwin')
    mocks.appData = '/Users/alice/Library/Application Support'

    expect(resolveUserDataPath({ isDev: false })).toBe('/Users/Shared/LouvorJA-PIANO')
    expect(resolveMacSharedUserDataPath()).toBe('/Users/Shared/LouvorJA-PIANO')
  })

  it('resolveUserDataPath no macOS em dev mantém appData per-user', () => {
    mocks.platform = 'darwin'
    platformSpy.mockReturnValue('darwin')
    mocks.appData = '/Users/alice/Library/Application Support'

    expect(resolveUserDataPath({ isDev: true })).toBe(
      path.join(mocks.appData, 'LouvorJA-PIANO'),
    )
  })

  it('resolveLegacyPerUserRoamingPath no Windows usa APPDATA', () => {
    mocks.platform = 'win32'
    platformSpy.mockReturnValue('win32')
    process.env.APPDATA = 'C:\\Users\\alice\\AppData\\Roaming'

    expect(resolveLegacyPerUserRoamingPath()).toBe(
      path.win32.join(process.env.APPDATA, 'LouvorJA-PIANO'),
    )
  })

  it('resolveLegacyLinuxElectronUserDataPaths inclui ~/.config/louvorja-piano', () => {
    mocks.platform = 'linux'
    platformSpy.mockReturnValue('linux')
    mocks.appData = '/home/user/.config'

    expect(resolveLegacyLinuxElectronUserDataPaths()).toEqual([
      path.join(mocks.appData, 'louvorja-piano'),
    ])
  })

  it('resolveLegacyMacElectronUserDataPaths inclui nomes legados do Electron', () => {
    mocks.platform = 'darwin'
    platformSpy.mockReturnValue('darwin')
    mocks.appData = '/Users/alice/Library/Application Support'

    expect(resolveLegacyMacElectronUserDataPaths()).toEqual([
      path.join(mocks.appData, 'louvorja-piano'),
      path.join(mocks.appData, 'LouvorJA - PIANO'),
    ])
  })

  it('resolveLegacyProgramFilesDataPath aponta para installDir/Data', () => {
    mocks.platform = 'win32'
    platformSpy.mockReturnValue('win32')

    expect(resolveLegacyProgramFilesDataPath()).toBe(
      'C:\\Program Files\\louvorja-piano\\Data',
    )
  })

  it('migra pasta legada por rename quando destino está vazio', () => {
    mocks.platform = 'win32'
    platformSpy.mockReturnValue('win32')
    process.env.APPDATA = 'C:\\Users\\alice\\AppData\\Roaming'
    process.env.ProgramData = 'C:\\ProgramData'

    const legacy = path.win32.join(process.env.APPDATA, 'LouvorJA-PIANO')
    const target = path.win32.join('C:\\ProgramData', 'LouvorJA-PIANO')

    mocks.existsSync.mockImplementation((p) => p === legacy)
    mocks.readdirSync.mockReturnValue(['Media'])

    migrateLegacyUserDataIfNeeded(target)

    expect(mocks.mkdirSync).toHaveBeenCalledWith(path.win32.dirname(target), { recursive: true })
    expect(mocks.renameSync).toHaveBeenCalledWith(legacy, target)
    expect(mocks.cpSync).not.toHaveBeenCalled()
  })

  it('migra pasta legada do Electron no Linux', () => {
    mocks.platform = 'linux'
    platformSpy.mockReturnValue('linux')
    mocks.appData = '/home/user/.config'

    const legacy = path.join(mocks.appData, 'louvorja-piano')
    const target = '/var/lib/LouvorJA-PIANO'

    mocks.existsSync.mockImplementation((p) => p === legacy)
    mocks.readdirSync.mockReturnValue(['Media'])

    migrateLegacyUserDataIfNeeded(target)

    expect(mocks.renameSync).toHaveBeenCalledWith(legacy, target)
  })

  it('migra pasta legada do Electron no macOS', () => {
    mocks.platform = 'darwin'
    platformSpy.mockReturnValue('darwin')
    mocks.appData = '/Users/alice/Library/Application Support'

    const legacy = path.join(mocks.appData, 'LouvorJA - PIANO')
    const target = '/Users/Shared/LouvorJA-PIANO'

    mocks.existsSync.mockImplementation((p) => p === legacy)
    mocks.readdirSync.mockReturnValue(['Media'])

    migrateLegacyUserDataIfNeeded(target)

    expect(mocks.renameSync).toHaveBeenCalledWith(legacy, target)
  })

  it('não sobrescreve destino que já tem conteúdo', () => {
    mocks.platform = 'win32'
    platformSpy.mockReturnValue('win32')
    process.env.APPDATA = 'C:\\Users\\alice\\AppData\\Roaming'
    process.env.ProgramData = 'C:\\ProgramData'

    const target = path.win32.join('C:\\ProgramData', 'LouvorJA-PIANO')
    const legacy = path.win32.join(process.env.APPDATA, 'LouvorJA-PIANO')

    mocks.existsSync.mockImplementation((p) => p === legacy || p === target)
    mocks.readdirSync.mockReturnValue(['Media'])

    migrateLegacyUserDataIfNeeded(target)

    expect(mocks.renameSync).not.toHaveBeenCalled()
    expect(mocks.cpSync).not.toHaveBeenCalled()
    expect(mocks.writeFileSync).toHaveBeenCalled()
  })

  it('configureUserDataPath no Linux empacotado aplica permissões e migração', () => {
    mocks.platform = 'linux'
    platformSpy.mockReturnValue('linux')
    mocks.appData = '/home/user/.config'

    configureUserDataPath({ isDev: false })

    expect(ensureLinuxSharedFolderPermissions).toHaveBeenCalledWith('/var/lib/LouvorJA-PIANO')
    expect(app.setPath).toHaveBeenCalledWith('userData', '/var/lib/LouvorJA-PIANO')
    expect(ensureWindowsSharedFolderAcl).not.toHaveBeenCalled()
    expect(ensureMacSharedFolderPermissions).not.toHaveBeenCalled()
  })

  it('configureUserDataPath no macOS empacotado aplica permissões e migração', () => {
    mocks.platform = 'darwin'
    platformSpy.mockReturnValue('darwin')
    mocks.appData = '/Users/alice/Library/Application Support'

    configureUserDataPath({ isDev: false })

    expect(ensureMacSharedFolderPermissions).toHaveBeenCalledWith('/Users/Shared/LouvorJA-PIANO')
    expect(app.setPath).toHaveBeenCalledWith('userData', '/Users/Shared/LouvorJA-PIANO')
    expect(ensureLinuxSharedFolderPermissions).not.toHaveBeenCalled()
    expect(ensureWindowsSharedFolderAcl).not.toHaveBeenCalled()
  })

  it('configureUserDataPath no Windows empacotado aplica ACL', () => {
    mocks.platform = 'win32'
    platformSpy.mockReturnValue('win32')
    process.env.ProgramData = 'C:\\ProgramData'

    configureUserDataPath({ isDev: false })

    expect(ensureWindowsSharedFolderAcl).toHaveBeenCalledWith(
      path.win32.join('C:\\ProgramData', 'LouvorJA-PIANO'),
    )
    expect(ensureLinuxSharedFolderPermissions).not.toHaveBeenCalled()
    expect(ensureMacSharedFolderPermissions).not.toHaveBeenCalled()
  })

  it('configureUserDataPath em dev mantém appData per-user', () => {
    mocks.platform = 'linux'
    platformSpy.mockReturnValue('linux')
    mocks.appData = '/home/user/.config'

    configureUserDataPath({ isDev: true })

    expect(app.setPath).toHaveBeenCalledWith(
      'userData',
      path.join(mocks.appData, 'LouvorJA-PIANO'),
    )
    expect(ensureLinuxSharedFolderPermissions).not.toHaveBeenCalled()
  })
})
