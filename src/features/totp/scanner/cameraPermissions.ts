/**
 * Camera Permissions Module for TOTP QR Scanner
 * Interfaces with Expo Camera permissions API with error handling
 */

import { Camera } from 'expo-camera';

export type CameraPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export interface CameraPermissionState {
  status: CameraPermissionStatus;
  canAskAgain: boolean;
  granted: boolean;
  error?: string;
}

/**
 * Checks current camera permissions without prompting the user.
 */
export async function getCameraPermissionState(): Promise<CameraPermissionState> {
  try {
    const permission = await Camera.getCameraPermissionsAsync();
    return {
      status: permission.granted
        ? 'granted'
        : permission.status === 'denied'
        ? 'denied'
        : 'undetermined',
      canAskAgain: permission.canAskAgain,
      granted: permission.granted,
    };
  } catch (err: unknown) {
    return {
      status: 'unavailable',
      canAskAgain: false,
      granted: false,
      error: (err as Error).message || 'Camera is not available on this device.',
    };
  }
}

/**
 * Requests camera permission from the operating system.
 */
export async function requestCameraPermission(): Promise<CameraPermissionState> {
  try {
    const permission = await Camera.requestCameraPermissionsAsync();
    return {
      status: permission.granted
        ? 'granted'
        : permission.status === 'denied'
        ? 'denied'
        : 'undetermined',
      canAskAgain: permission.canAskAgain,
      granted: permission.granted,
    };
  } catch (err: unknown) {
    return {
      status: 'unavailable',
      canAskAgain: false,
      granted: false,
      error: (err as Error).message || 'Failed to request camera permission.',
    };
  }
}
