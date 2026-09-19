export const APP_CONFIG = {
  name: 'VaultNote',
  version: '1.0.0',
  autoLockTimeouts: [
    { label: 'Immediately', value: 0 },
    { label: '1 minute', value: 60 },
    { label: '5 minutes', value: 300 },
    { label: '15 minutes', value: 900 },
    { label: 'Never', value: -1 },
  ],
  clipboardTimeoutSeconds: 30,
  argon2Parameters: {
    memory: 65536, // 64 MB
    iterations: 4,
    parallelism: 4,
    hashLength: 32,
  },
} as const;
