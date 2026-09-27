/**
 * VaultNote Local Biometric Authentication Service
 * Wraps platform hardware sensors (Face ID, Touch ID, BiometricPrompt)
 * Phase 2: Authentication, Session State & Hardware Security
 */

import {
  BiometricAdapter,
  BiometricAuthPromptOptions,
  BiometricAuthResult,
  BiometricAuthType,
  BiometricHardwareStatus,
  BiometricSecurityLevel,
} from './types';

/**
 * In-memory fallback adapter for test and simulation environments
 */
export class InMemoryBiometricAdapter implements BiometricAdapter {
  private hasHardwareFlag: boolean = true;
  private isEnrolledFlag: boolean = true;
  private supportedAuthTypes: BiometricAuthType[] = ['facial', 'fingerprint'];
  private securityLevelState: BiometricSecurityLevel = 'strong';
  private shouldSucceed: boolean = true;
  private failureError: string = 'User cancelled biometric prompt';

  setSimulationOptions(options: {
    hasHardware?: boolean;
    isEnrolled?: boolean;
    supportedTypes?: BiometricAuthType[];
    securityLevel?: BiometricSecurityLevel;
    shouldSucceed?: boolean;
    failureError?: string;
  }): void {
    if (options.hasHardware !== undefined) this.hasHardwareFlag = options.hasHardware;
    if (options.isEnrolled !== undefined) this.isEnrolledFlag = options.isEnrolled;
    if (options.supportedTypes !== undefined) this.supportedAuthTypes = options.supportedTypes;
    if (options.securityLevel !== undefined) this.securityLevelState = options.securityLevel;
    if (options.shouldSucceed !== undefined) this.shouldSucceed = options.shouldSucceed;
    if (options.failureError !== undefined) this.failureError = options.failureError;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async checkHardwareStatus(): Promise<BiometricHardwareStatus> {
    return {
      hasHardware: this.hasHardwareFlag,
      isEnrolled: this.isEnrolledFlag,
      supportedTypes: [...this.supportedAuthTypes],
      securityLevel: this.securityLevelState,
    };
  }

  async authenticate(_options?: BiometricAuthPromptOptions): Promise<BiometricAuthResult> {
    if (!this.hasHardwareFlag || !this.isEnrolledFlag) {
      return {
        success: false,
        error: 'Biometric hardware is not available or not enrolled',
      };
    }

    if (this.shouldSucceed) {
      return { success: true };
    }

    return {
      success: false,
      error: this.failureError,
    };
  }

  async cancelAuthenticate(): Promise<void> {
    // No-op in memory
  }
}

/**
 * Native Expo LocalAuthentication adapter
 */
export class ExpoLocalAuthAdapter implements BiometricAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private localAuth: any = null;

  constructor() {
    try {
      // Dynamic import to prevent bundler errors during non-native testing
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.localAuth = require('expo-local-authentication');
    } catch {
      this.localAuth = null;
    }
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.localAuth && typeof this.localAuth.authenticateAsync === 'function');
  }

  async checkHardwareStatus(): Promise<BiometricHardwareStatus> {
    if (!this.localAuth) {
      return {
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: ['none'],
        securityLevel: 'none',
      };
    }

    try {
      const [hasHardware, isEnrolled, rawTypes, rawSecurity] = await Promise.all([
        this.localAuth.hasHardwareAsync(),
        this.localAuth.isEnrolledAsync(),
        this.localAuth.supportedAuthenticationTypesAsync(),
        this.localAuth.getEnrolledLevelAsync(),
      ]);

      const supportedTypes: BiometricAuthType[] = [];
      if (Array.isArray(rawTypes)) {
        if (rawTypes.includes(2)) supportedTypes.push('facial');
        if (rawTypes.includes(1)) supportedTypes.push('fingerprint');
        if (rawTypes.includes(3)) supportedTypes.push('iris');
      }
      if (supportedTypes.length === 0) supportedTypes.push('none');

      let securityLevel: BiometricSecurityLevel = 'none';
      if (rawSecurity === 3) securityLevel = 'strong';
      else if (rawSecurity === 2) securityLevel = 'weak';
      else if (rawSecurity === 1) securityLevel = 'secret';

      return {
        hasHardware: Boolean(hasHardware),
        isEnrolled: Boolean(isEnrolled),
        supportedTypes,
        securityLevel,
      };
    } catch {
      return {
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: ['none'],
        securityLevel: 'none',
      };
    }
  }

  async authenticate(options?: BiometricAuthPromptOptions): Promise<BiometricAuthResult> {
    if (!this.localAuth) {
      return {
        success: false,
        error: 'Local authentication native module is unavailable',
      };
    }

    try {
      const result = await this.localAuth.authenticateAsync({
        promptMessage: options?.promptMessage ?? 'Unlock your private VaultNote',
        cancelLabel: options?.cancelLabel ?? 'Use Master Password',
        fallbackLabel: options?.fallbackLabel ?? 'Master Password',
        disableDeviceFallback: options?.disableDeviceFallback ?? true,
      });

      if (result.success) {
        return { success: true };
      }

      return {
        success: false,
        error: result.error ?? 'Authentication failed',
        warning: result.warning,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Biometric prompt error',
      };
    }
  }

  async cancelAuthenticate(): Promise<void> {
    if (this.localAuth && typeof this.localAuth.cancelAuthenticate === 'function') {
      try {
        await this.localAuth.cancelAuthenticate();
      } catch {
        // Suppress cancellation errors
      }
    }
  }
}

class BiometricService {
  private adapter: BiometricAdapter;

  constructor(adapter?: BiometricAdapter) {
    this.adapter = adapter ?? new ExpoLocalAuthAdapter();
  }

  setAdapter(adapter: BiometricAdapter): void {
    this.adapter = adapter;
  }

  /**
   * Determine whether biometric sensors exist and have credentials enrolled
   */
  async checkHardwareStatus(): Promise<BiometricHardwareStatus> {
    try {
      if (await this.adapter.isAvailable()) {
        return await this.adapter.checkHardwareStatus();
      }
    } catch {
      // Fallback
    }

    const fallback = new InMemoryBiometricAdapter();
    this.adapter = fallback;
    return await fallback.checkHardwareStatus();
  }

  /**
   * Request biometric authentication with hardware prompt
   */
  async authenticate(options?: BiometricAuthPromptOptions): Promise<BiometricAuthResult> {
    try {
      if (await this.adapter.isAvailable()) {
        return await this.adapter.authenticate(options);
      }
    } catch {
      // Fallback
    }

    const fallback = new InMemoryBiometricAdapter();
    this.adapter = fallback;
    return await fallback.authenticate(options);
  }

  /**
   * Dismiss biometric prompt if open
   */
  async cancelAuthenticate(): Promise<void> {
    try {
      await this.adapter.cancelAuthenticate();
    } catch {
      // Suppress
    }
  }

  /**
   * Format human-readable title based on hardware capability
   */
  getBiometricTypeLabel(types: BiometricAuthType[]): string {
    if (types.includes('facial')) return 'Face ID';
    if (types.includes('fingerprint')) return 'Touch ID';
    if (types.includes('iris')) return 'Iris Recognition';
    return 'Biometrics';
  }
}

export const biometricService = new BiometricService();

export const checkBiometricHardware = (): Promise<BiometricHardwareStatus> => {
  return biometricService.checkHardwareStatus();
};

export const authenticateBiometric = (
  options?: BiometricAuthPromptOptions
): Promise<BiometricAuthResult> => {
  return biometricService.authenticate(options);
};

export const cancelBiometric = (): Promise<void> => {
  return biometricService.cancelAuthenticate();
};

export const getBiometricLabel = (types: BiometricAuthType[]): string => {
  return biometricService.getBiometricTypeLabel(types);
};
