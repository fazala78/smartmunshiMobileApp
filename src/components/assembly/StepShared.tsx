// steps/StepShared.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing } from '../../theme';

// ─── Subcomponents ───────────────────────────────────────────────────────────

export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < current - 1
              ? styles.dotDone
              : i === current - 1
              ? styles.dotActive
              : styles.dotIdle,
          ]}
        />
      ))}
    </View>
  );
}

export function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

interface SourceOptionProps {
  icon: string;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

export function SourceOption({
  icon,
  title,
  description,
  selected,
  onPress,
}: SourceOptionProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.sourceCard, selected && styles.sourceCardSelected]}
    >
      <View style={[styles.sourceIconBox, selected && styles.sourceIconBoxSelected]}>
        <Icon name={icon} size={22} color={selected ? colors.white : colors.textSecondary} />
      </View>
      <View style={styles.sourceTextBox}>
        <Text style={[styles.sourceTitle, selected && styles.sourceTitleSelected]}>{title}</Text>
        <Text style={styles.sourceDesc}>{description}</Text>
      </View>
      <View style={styles.radioOuter}>{selected && <View style={styles.radioInner} />}</View>
    </TouchableOpacity>
  );
}

interface ProcessCardProps {
  item: Process;
  selected: boolean;
  onPress: () => void;
}

export function ProcessCard({ item, selected, onPress }: ProcessCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.processCard, selected && styles.processCardSelected]}
    >
      {selected && (
        <View style={styles.processCheck}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>✓</Text>
        </View>
      )}
      <View style={[styles.processIconBox, selected && styles.processIconBoxSelected]}>
        <Text style={styles.processEmoji}>
          <Icon name="autorenew" size={30} color={colors.gray600} />
          </Text>
      </View>
      <Text style={styles.processLabel}>{item.name}</Text>
    </TouchableOpacity>
  );
}

export function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.overviewRow}>
      <Text style={styles.overviewLabel}>{label}</Text>
      <Text style={styles.overviewValue}>{value}</Text>
    </View>
  );
}

// ─── Styles (shared) ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Step dots
  dotsRow: { flexDirection: 'row', gap: spacing.sm },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 28, backgroundColor: colors.primary },
  dotDone: { width: 28, backgroundColor: colors.primaryBorder, opacity: 0.6 },
  dotIdle: { width: 28, backgroundColor: colors.gray200 },

  // Section label
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },

  // Source option
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  sourceCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  sourceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  sourceIconBoxSelected: { backgroundColor: colors.primary },
  sourceTextBox: { flex: 1 },
  sourceTitle: { fontWeight: '700', fontSize: 15, color: colors.textPrimary, marginBottom: spacing.xs },
  sourceTitleSelected: { color: colors.primary },
  sourceDesc: { fontSize: 12, color: colors.textSecondary },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  radioInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },

  // Process card
  processCard: {
    width: (Dimensions.get('window').width - 48 - 20) / 2,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
    position: 'relative',
  },
  processCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  processCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processIconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  processIconBoxSelected: { backgroundColor: colors.primary },
  processEmoji: { fontSize: 26 },
  processLabel: { fontWeight: '700', fontSize: 14, color: colors.textPrimary, marginBottom: spacing.xs },
  processSub: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },

  // Overview row
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  overviewLabel: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  overviewValue: { fontWeight: '600', fontSize: 13, color: colors.textPrimary, flex: 1, textAlign: 'right' },
});

// Required for Dimensions in processCard
import { Dimensions } from 'react-native';
import { Process } from '../../types/assembly';
