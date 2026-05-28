
/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string
  readonly VITE_BASE_VERSION: string
  readonly VITE_GIT_HASH: string
  readonly VITE_GIT_BRANCH: string
  readonly VITE_BUILD_TIME: string
  readonly VITE_BUILD_TIMESTAMP: string
  readonly VITE_PLATFORM: 'web' | 'mobile'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
