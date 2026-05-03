/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly GATEWAY_URL: string;
  readonly DATABASE_URL: string;
  readonly DATABASE_AUTH_TOKEN?: string;
  readonly NATS_URL?: string;
  readonly POS_EVENT_BUS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
