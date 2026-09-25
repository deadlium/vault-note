/**
 * QRScanner Component
 * Native camera-based QR scanner using Expo CameraView
 * Features viewfinder reticle, permission controls, and scanner throttle
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIEWFINDER_SIZE = Math.min(260, SCREEN_WIDTH * 0.72);

export interface QRScannerProps {
  /** Callback invoked when a QR code payload is detected */
  onScan: (data: string) => void;
  /** Callback invoked when user cancels scanning */
  onCancel?: () => void;
  /** Whether the scanner is currently processing a code */
  isProcessing?: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  onCancel,
  isProcessing = false,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // Viewfinder laser scanning line animation
  useEffect(() => {
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    scanLoop.start();
    return () => scanLoop.stop();
  }, [scanLineAnim]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (hasScanned || isProcessing) return;
    setHasScanned(true);
    onScan(data);
  };

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, VIEWFINDER_SIZE - 4],
  });

  // 1. Permission undetermined state
  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.permissionSubtext}>Initializing camera interface...</Text>
      </View>
    );
  }

  // 2. Permission denied state
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionIconCircle}>
          <Ionicons name="camera-outline" size={36} color={colors.primaryLight} />
        </View>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionSubtext}>
          VaultNote needs camera access to scan authenticator QR codes directly from your screen or document.
        </Text>

        <Pressable
          onPress={requestPermission}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Grant Camera Permission"
        >
          <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryButtonText}>Grant Camera Access</Text>
        </Pressable>

        {onCancel && (
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
        )}
      </View>
    );
  }

  // 3. Active Camera Scanner Viewport
  return (
    <View style={styles.scannerWrapper}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchEnabled}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
      />

      {/* Dimmed Vignette Mask around Viewfinder */}
      <View style={styles.maskContainer}>
        <View style={styles.maskTop} />

        <View style={styles.maskCenterRow}>
          <View style={styles.maskSide} />

          {/* Transparent Viewfinder Target */}
          <View style={styles.viewfinder}>
            {/* 4 Corner Accents */}
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />

            {/* Laser scanning beam */}
            <Animated.View
              style={[
                styles.scanLine,
                { transform: [{ translateY: scanLineTranslateY }] },
              ]}
            />

            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="small" color={colors.emerald} />
                <Text style={styles.processingText}>Verifying code...</Text>
              </View>
            )}
          </View>

          <View style={styles.maskSide} />
        </View>

        <View style={styles.maskBottom}>
          <Text style={styles.instructionText}>
            Align the 2FA QR code within the frame to enroll
          </Text>

          {/* Controls Bar */}
          <View style={styles.controlsRow}>
            <Pressable
              onPress={() => setTorchEnabled((prev) => !prev)}
              style={({ pressed }) => [
                styles.controlButton,
                torchEnabled && styles.controlButtonActive,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Toggle Flashlight"
            >
              <Ionicons
                name={torchEnabled ? 'flash' : 'flash-outline'}
                size={20}
                color={torchEnabled ? colors.gold : '#FFFFFF'}
              />
            </Pressable>

            {hasScanned && (
              <Pressable
                onPress={() => setHasScanned(false)}
                style={({ pressed }) => [
                  styles.controlButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Rescan"
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
              </Pressable>
            )}

            {onCancel && (
              <Pressable
                onPress={onCancel}
                style={({ pressed }) => [
                  styles.controlButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close Scanner"
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  scannerWrapper: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  permissionIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  permissionTitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  permissionSubtext: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    width: '100%',
    maxWidth: 280,
  },
  primaryButtonText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 14,
    color: colors.textMuted,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  maskContainer: {
    ...StyleSheet.absoluteFill,
  },
  maskTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  maskCenterRow: {
    flexDirection: 'row',
    height: VIEWFINDER_SIZE,
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.emerald,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  scanLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: colors.emerald,
    shadowColor: colors.emerald,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  processingText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 12,
    color: colors.emerald,
    marginTop: 6,
    fontWeight: '600',
  },
  maskBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xl,
  },
  instructionText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 13,
    color: '#D1D5DB',
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
    borderColor: colors.gold,
  },
});
