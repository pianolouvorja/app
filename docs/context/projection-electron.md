# Projeção no Electron (APP)

## Papel

O APP controla monitores físicos via Electron `screen` API e abre janelas de projeção nativas (ou popups com bridge).

## Peças principais

| Peça | Responsabilidade |
|------|------------------|
| `electron/main.mjs` | BrowserWindows, IPC |
| `desktop-bridge` / `window.louvorja` | API exposta ao renderer |
| `useProjectionWindow` | Abrir/fechar janelas de projeção |
| `useMonitorTargetSelect` | Escolher monitores alvo |
| `ProjectionHost` | Render do módulo via query `?module=` |
| `display-service` / `monitor-layout` | Lista e layout visual dos displays |

## Bridge (contrato)

```typescript
interface LouvorJaBridge {
  isElectron: boolean
  displays: {
    list(): Promise<SystemDisplayInfo[]>
    identify(): Promise<boolean>
  }
  projection: {
    openUrl(payload: unknown): Promise<boolean>
    closeModule?(): Promise<boolean>
  }
}
```

## Estado alvo (SPEC-02)

Hoje: 1 conteúdo espelhado em N monitores.  
Alvo: N janelas com conteúdo independente (mapa módulo/tela).

## Regras

- Sempre `isDesktopApp()` antes da bridge
- Não misturar modelo de `slot` do web com `displayId`
- Detalhes de aceite: `docs/planning/specs/SPEC-02-Multi-Projection.md`
