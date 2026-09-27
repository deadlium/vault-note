/**
 * VaultNote Clipboard Service Types
 * Secure ephemeral clipboard management with auto-wipe hygiene
 */

export interface ClipboardCopyOptions {
  /**
   * Whether the copied data is sensitive (e.g. Master Password, Recovery Phrase, TOTP code).
   * If true, an auto-wipe timer is scheduled.
   * Default: false
   */
  isSensitive?: boolean;

  /**
   * Timeout in seconds before sensitive clipboard data is automatically purged.
   * Defaults to APP_CONFIG.security.clipboardTimeoutSeconds (30s).
   */
  timeoutSeconds?: number;

  /**
   * Descriptive label for audit logging or toast messaging (e.g. "Password", "Recovery Phrase").
   */
  label?: string;
}

export interface ClipboardAdapter {
  isAvailable(): Promise<boolean>;
  setString(text: string): Promise<boolean>;
  getString(): Promise<string>;
  hasString(): Promise<boolean>;
  clear(): Promise<boolean>;
}
