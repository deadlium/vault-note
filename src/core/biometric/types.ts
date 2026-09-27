/**
 * VaultNote Biometric Authentication Types
 * Phase 2: Authentication, Session State & Hardware Security
 */

export type BiometricAuthType = 'facial' | 'fingerprint' | 'iris' | 'none';

export type BiometricSecurityLevel = 'none' | 'secret' | 'weak' | 'strong';

export interface BiometricHardwareStatus {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: BiometricAuthType[];
  securityLevel: BiometricSecurityLevel;
}

export interface BiometricAuthPromptOptions {
  promptMessage?: string;
  cancelLabel?: string;
  fallbackLabel?: string;
  disableDeviceFallback?: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  warning?: string;
}

export interface BiometricAdapter {
  isAvailable(): Promise<boolean>;
  checkHardwareStatus(): Promise<BiometricHardwareStatus>;
  authenticate(options?: BiometricAuthPromptOptions): Promise<BiometricAuthResult>;
  cancelAuthenticate(): Promise<void>;
}
