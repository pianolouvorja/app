import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock workspace.mjs — isEulaAccepted depende de readWorkspaceRecord
vi.mock("../workspace.mjs", () => ({
  readWorkspaceRecord: vi.fn(),
  writeWorkspaceRecord: vi.fn(),
}));

// Mock electron — dialog e app
vi.mock("electron", () => ({
  app: {
    getAppPath: vi.fn(() => {
      throw new Error("test");
    }),
  },
  dialog: {
    showMessageBoxSync: vi.fn(),
  },
  BrowserWindow: vi.fn(function BrowserWindowMock() {
    return {
    id: 1,
    isDestroyed: vi.fn(() => false),
    destroy: vi.fn(),
    close: vi.fn(),
    show: vi.fn(),
    focus: vi.fn(),
    once: vi.fn(),
    on: vi.fn(),
    loadURL: vi.fn(() => Promise.resolve()),
    webContents: {
      on: vi.fn(),
      setWindowOpenHandler: vi.fn(),
    },
    };
  }),
  ipcMain: {
    once: vi.fn(),
    removeListener: vi.fn(),
  },
  screen: {
    getPrimaryDisplay: vi.fn(() => ({
      workAreaSize: { width: 1920, height: 1080 },
    })),
  },
}));

import { BrowserWindow, dialog } from "electron";
// Importar após o mock
import {
  __setEulaPlatformForTests,
  __setEulaPresenterForTests,
  acceptEula,
  checkEulaAcceptance,
  getEulaText,
  isEulaAccepted,
  presentEulaAcceptanceWindow,
  showEulaDialog,
} from "../eula.mjs";
import { readWorkspaceRecord, writeWorkspaceRecord } from "../workspace.mjs";

describe("isEulaAccepted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna true quando record existe com accepted: true e versao atual", () => {
    readWorkspaceRecord.mockReturnValue({
      accepted: true,
      version: 1,
      date: "2026-08-07",
    });
    expect(isEulaAccepted()).toBe(true);
  });

  it("retorna false quando record e null (primeira execucao)", () => {
    readWorkspaceRecord.mockReturnValue(null);
    expect(isEulaAccepted()).toBe(false);
  });

  it("retorna false quando accepted e false", () => {
    readWorkspaceRecord.mockReturnValue({ accepted: false, version: 1 });
    expect(isEulaAccepted()).toBe(false);
  });

  it("retorna false quando versao do record e anterior", () => {
    readWorkspaceRecord.mockReturnValue({ accepted: true, version: 0 });
    expect(isEulaAccepted()).toBe(false);
  });
});

describe("acceptEula", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("grava record com accepted true e versao atual", () => {
    writeWorkspaceRecord.mockReturnValue(true);
    expect(acceptEula()).toBe(true);
    expect(writeWorkspaceRecord).toHaveBeenCalledWith(
      "eula",
      expect.objectContaining({
        accepted: true,
        version: 1,
      }),
    );
  });
});

describe("getEulaText", () => {
  it("le arquivo pt-BR.txt e retorna conteudo como string", () => {
    const text = getEulaText("pt-BR");
    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
  });

  it("le arquivo en.txt e retorna conteudo como string", () => {
    const text = getEulaText("en");
    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
  });

  it("le arquivo es.txt e retorna conteudo como string", () => {
    const text = getEulaText("es");
    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
  });
});

describe("presentEulaAcceptanceWindow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    __setEulaPlatformForTests(null);
    __setEulaPresenterForTests(null);
  });

  it.each(["win32", "linux"])("mantém o presenter existente em %s", async (platform) => {
    __setEulaPlatformForTests(platform);
    __setEulaPresenterForTests(async () => 0);

    expect(await presentEulaAcceptanceWindow("pt-BR")).toBe(0);
    expect(BrowserWindow).not.toHaveBeenCalled();
  });

  it("abre a janela segura e rolável exclusivamente no macOS", async () => {
    __setEulaPlatformForTests("darwin");
    const decision = presentEulaAcceptanceWindow("pt-BR");

    expect(BrowserWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        resizable: true,
        webPreferences: expect.objectContaining({
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        }),
      }),
    );
    const window = BrowserWindow.mock.results[0].value;
    expect(window.loadURL).toHaveBeenCalledWith(expect.stringContaining("data:text/html"));
    expect(window.webContents.setWindowOpenHandler).toHaveBeenCalledWith(expect.any(Function));

    const closeHandler = window.on.mock.calls.find(([event]) => event === "close")[1];
    closeHandler({ preventDefault: vi.fn() });
    await expect(decision).resolves.toBe(1);
  });
});

describe("showEulaDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    __setEulaPlatformForTests(null);
    __setEulaPresenterForTests(null);
  });

  it('retorna true e chama acceptEula quando usuario clica "Aceitar" (response=0)', async () => {
    writeWorkspaceRecord.mockReturnValue(true);
    __setEulaPresenterForTests(async () => 0);

    const result = await showEulaDialog("pt-BR");
    expect(writeWorkspaceRecord).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("retorna false quando usuario recusa EULA (response=1) — sem confirmacao dupla", () => {
    dialog.showMessageBoxSync.mockReturnValue(1); // 1 = Recusar

    const result = showEulaDialog("pt-BR");
    expect(dialog.showMessageBoxSync).toHaveBeenCalledTimes(1);
    expect(writeWorkspaceRecord).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("passa o texto do EULA do locale correto para o dialog", () => {
    dialog.showMessageBoxSync.mockReturnValue(0);
    writeWorkspaceRecord.mockReturnValue(true);

    await showEulaDialog("pt-BR");
    const confirmArgs = dialog.showMessageBoxSync.mock.calls[0][0];
    expect(confirmArgs.title).toContain("certeza");
    expect(confirmArgs.buttons).toContain("Sim, recusar");
  });

  it("dialog de confirmacao usa locale en", async () => {
    __setEulaPresenterForTests(async () => 1);
    dialog.showMessageBoxSync.mockReturnValue(1);

    await showEulaDialog("en");
    const confirmArgs = dialog.showMessageBoxSync.mock.calls[0][0];
    expect(confirmArgs.title).toContain("sure");
    expect(confirmArgs.buttons).toContain("Yes, decline");
  });
});

describe("confirmDecline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    __setEulaPlatformForTests(null);
    __setEulaPresenterForTests(null);
  });

  it("retorna false quando usuario confirma recusa", async () => {
    dialog.showMessageBoxSync.mockReturnValue(1); // Confirm: Sim, recusar

    const result = await confirmDecline("pt-BR");
    expect(result).toBe(false);
  });
});

describe("checkEulaAcceptance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    __setEulaPlatformForTests(null);
    __setEulaPresenterForTests(null);
  });

  it("retorna true sem mostrar dialog quando EULA ja foi aceito na versao atual", async () => {
    readWorkspaceRecord.mockReturnValue({ accepted: true, version: 1 });
    writeWorkspaceRecord.mockReturnValue(true);

    const result = await checkEulaAcceptance("pt-BR");
    expect(dialog.showMessageBoxSync).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("mostra dialog quando versao do record e anterior", async () => {
    readWorkspaceRecord.mockReturnValue({ accepted: true, version: 0 });
    writeWorkspaceRecord.mockReturnValue(true);
    __setEulaPresenterForTests(async () => 0);

    const result = await checkEulaAcceptance("pt-BR");
    expect(writeWorkspaceRecord).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("mostra dialog e retorna true quando usuario aceita (primeira execucao)", async () => {
    readWorkspaceRecord.mockReturnValue(null);
    writeWorkspaceRecord.mockReturnValue(true);
    __setEulaPresenterForTests(async () => 0);

    const result = await checkEulaAcceptance("pt-BR");
    expect(writeWorkspaceRecord).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("mostra dialog e retorna false quando usuario recusa", () => {
    readWorkspaceRecord.mockReturnValue(null);
    dialog.showMessageBoxSync.mockReturnValue(1); // Recusar

    const result = checkEulaAcceptance("pt-BR");
    expect(dialog.showMessageBoxSync).toHaveBeenCalledTimes(1);
    expect(writeWorkspaceRecord).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });
});
