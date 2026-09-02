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

import {
  configureUserDataPath,
  migrateLegacyUserDataIfNeeded,
  resolveLegacyPerUserRoamingPath,
  resolveLegacyProgramFilesDataPath,
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

  it('resolveUserDataPath no Linux mantém appData per-user', () => {
    mocks.platform = 'linux'
    platformSpy.mockReturnValue('linux')

    expect(resolveUserDataPath({ isDev: false })).toBe(
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

    migrateLegacyUserDataIfNeeded(target)

    expect(mocks.mkdirSync).toHaveBeenCalledWith(path.win32.dirname(target), { recursive: true })
    expect(mocks.renameSync).toHaveBeenCalledWith(legacy, target)
    expect(mocks.cpSync).not.toHaveBeenCalled()
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

  it('configureUserDataPath define userData no app', () => {
    mocks.platform = 'linux'
    platformSpy.mockReturnValue('linux')

    configureUserDataPath({ isDev: false })

    expect(app.setPath).toHaveBeenCalledWith(
      'userData',
      path.join(mocks.appData, 'LouvorJA-PIANO'),
    )
  })
})
