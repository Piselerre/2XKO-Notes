/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ANNOUNCEMENTS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
