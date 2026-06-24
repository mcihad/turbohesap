/// <reference types="vite/client" />

// Typed VITE_* environment variables exposed to the browser. Only VITE_-prefixed
// vars are inlined by Vite; they all read from the repo-root .env (see
// vite.config.ts envDir).
interface ImportMetaEnv {
  /** Base path of the JSON API. Default: '/api'. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
