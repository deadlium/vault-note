/**
 * PasswordGeneratorModal Component
 * Obsidian bottom-sheet modal for generating and injecting strong credentials
 */

import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '../../../theme';
import { PasswordGeneratorView } from './PasswordGeneratorView';

export interface PasswordGeneratorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPassword: (password: string) => void;
}

export function PasswordGeneratorModal({
  visible,
  onClose,
  onSelectPassword,
}: PasswordGeneratorModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />
        <SafeAreaView style={styles.sheetContainer} edges={['bottom']}>
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>
          <PasswordGeneratorView
            isModal
            onClose={onClose}
            onSelectPassword={(pw) => {
              onSelectPassword(pw);
              onClose();
            }}
            actionButtonLabel="Insert Generated Password"
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContainer: {
    height: '88%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
});
