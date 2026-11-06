/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** "1": register the service worker in development too. */
  readonly VITE_ENABLE_SW?: string
}
