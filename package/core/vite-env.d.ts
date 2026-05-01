/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly GATEWAY_URL: string;
  readonly DATABASE_URL: string;
  readonly DATABASE_AUTH_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
