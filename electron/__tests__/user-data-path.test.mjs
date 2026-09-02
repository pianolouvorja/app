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
  WINDOWS_SHARED_DATA_DIR,
  configureUserDataPath,
  migrateLegacyUserDataIfNeeded,
  resolveLegacyPerUserRoamingPath,
  resolveUserDataPath,
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
  })

  it('resolveUserDataPath no Windows empacotado usa installDir/Data', () => {
    mocks.platform = 'win32'
    platformSpy.mockReturnValue('win32')

    expect(resolveUserDataPath({ isDev: false })).toBe(
      path.win32.join('C:\\Program Files\\louvorja-piano', WINDOWS_SHARED_DATA_DIR),
    )
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

  it('migra pasta legada por rename quando destino está vazio', () => {
    mocks.platform = 'win32'
    platformSpy.mockReturnValue('win32')
    process.env.APPDATA = 'C:\\Users\\alice\\AppData\\Roaming'

    const legacy = path.win32.join(process.env.APPDATA, 'LouvorJA-PIANO')
    const target = path.win32.join('C:\\Program Files\\louvorja-piano', WINDOWS_SHARED_DATA_DIR)

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

    const target = path.win32.join('C:\\Program Files\\louvorja-piano', WINDOWS_SHARED_DATA_DIR)
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
