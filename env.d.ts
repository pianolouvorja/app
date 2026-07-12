/// <reference types="vite/client" />

declare global {
  const __APP_VERSION__: string

  interface LouvorJaBridge {
    platform: NodeJS.Platform
    isElectron: boolean
  }

  interface Window {
    louvorja?: LouvorJaBridge
  }
}

declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.png' {
  const src: string
  export default src
}

export {}
