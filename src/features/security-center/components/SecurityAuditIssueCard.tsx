/**
 * SecurityAuditIssueCard Component
 * High-craft actionable vulnerability card displaying security hygiene issues,
 * affected vault accounts, and direct resolution pathways.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../../theme';
import { AuditIssue, AuditSeverity } from '../types';

export interface SecurityAuditIssueCardProps {
  issue: AuditIssue;
  onResolve?: (issue: AuditIssue) => void;
  onSelectItemId?: (itemId: string) => void;
}

export const SecurityAuditIssueCard: React.FC<SecurityAuditIssueCardProps> = ({
  issue,
  onResolve,
  onSelectItemId,
}) => {
  const getSeverityStyle = (severity: AuditSeverity) => {
    switch (severity) {
      case 'critical':
        return {
          accentColor: colors.crimson,
          badgeBg: 'rgba(239, 68, 68, 0.15)',
          badgeText: '#FCA5A5',
          badgeBorder: 'rgba(239, 68, 68, 0.35)',
          iconName: 'alert-circle' as const,
          label: 'CRITICAL',
        };
      case 'warning':
        return {
          accentColor: colors.amber,
          badgeBg: 'rgba(245, 158, 11, 0.15)',
          badgeText: '#FCD34D',
          badgeBorder: 'rgba(245, 158, 11, 0.35)',
          iconName: 'warning' as const,
          label: 'WARNING',
        };
      case 'info':
      default:
        return {
          accentColor: '#818CF8',
          badgeBg: 'rgba(129, 140, 248, 0.15)',
          badgeText: '#C7D2FE',
          badgeBorder: 'rgba(129, 140, 248, 0.35)',
          iconName: 'information-circle' as const,
          label: 'RECOMMENDATION',
        };
    }
  };

  const styleConfig = getSeverityStyle(issue.severity);

  const getActionLabel = () => {
    switch (issue.resolutionAction) {
      case 'edit_item':
        return 'Update Credential';
      case 'configure_totp':
        return 'Setup 2FA';
      case 'configure_autolock':
        return 'Change Auto-Lock';
      case 'configure_biometric':
        return 'Enable Biometrics';
      case 'configure_privacy':
        return 'Enable Privacy Shield';
      default:
        return 'Resolve';
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          borderLeftColor: styleConfig.accentColor,
        },
      ]}
    >
      {/* Header Row: Severity Pill + Metric Tag */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Ionicons
            name={styleConfig.iconName}
            size={16}
            color={styleConfig.accentColor}
            style={styles.severityIcon}
          />
          <View
            style={[
              styles.severityBadge,
              {
                backgroundColor: styleConfig.badgeBg,
                borderColor: styleConfig.badgeBorder,
              },
            ]}
          >
            <Text style={[styles.severityBadgeText, { color: styleConfig.badgeText }]}>
              {styleConfig.label}
            </Text>
          </View>
        </View>

        {issue.metric && (
          <View style={styles.metricBadge}>
            <Text style={styles.metricText}>{issue.metric}</Text>
          </View>
        )}
      </View>

      {/* Title & Description */}
      <Text style={styles.title}>{issue.title}</Text>
      <Text style={styles.description}>{issue.description}</Text>

      {/* Affected Items Chips */}
      {issue.affectedItemTitles.length > 0 && (
        <View style={styles.affectedSection}>
          <Text style={styles.affectedLabel}>Affected Accounts:</Text>
          <View style={styles.chipRow}>
            {issue.affectedItemTitles.slice(0, 4).map((title, idx) => {
              const itemId = issue.affectedItemIds[idx];
              return (
                <Pressable
                  key={`${title}_${idx}`}
                  onPress={() => itemId && onSelectItemId?.(itemId)}
                  style={({ pressed }) => [
                    styles.itemChip,
                    pressed && styles.itemChipPressed,
                  ]}
                >
                  <Ionicons name="key-outline" size={11} color="#C4B5FD" />
                  <Text style={styles.chipText} numberOfLines={1}>
                    {title}
                  </Text>
                </Pressable>
              );
            })}
            {issue.affectedItemTitles.length > 4 && (
              <View style={styles.moreChip}>
                <Text style={styles.moreChipText}>
                  +{issue.affectedItemTitles.length - 4} more
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Action Button Row */}
      {onResolve && (
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => onResolve(issue)}
            style={({ pressed }) => [
              styles.actionButton,
              { borderColor: styleConfig.badgeBorder },
              pressed && styles.actionButtonPressed,
            ]}
          >
            <Text style={[styles.actionButtonText, { color: styleConfig.badgeText }]}>
              {getActionLabel()}
            </Text>
            <Ionicons name="arrow-forward" size={13} color={styleConfig.badgeText} />
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderLeftWidth: 3.5,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityIcon: {
    marginRight: 6,
  },
  severityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  severityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  metricBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  metricText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.mono,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  affectedSection: {
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  affectedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  itemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    maxWidth: 160,
  },
  itemChipPressed: {
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
  },
  chipText: {
    fontSize: 11,
    color: '#DDD6FE',
    fontWeight: '600',
    marginLeft: 4,
  },
  moreChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    justifyContent: 'center',
  },
  moreChipText: {
    fontSize: 10,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  actionRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  actionButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 6,
  },
});
