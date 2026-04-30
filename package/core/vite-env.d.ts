/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly GATEWAY_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
