// steps/StepShared.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing } from '../../theme';
import { createProcess, getProcesses } from '../../services/assemblyService';

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

// ─── Process icon map ─────────────────────────────────────────────────────────

const PROCESS_ICONS: { keywords: string[]; icon: string }[] = [
  { keywords: ['dye', 'dyeing'],                          icon: 'colorize' },
  { keywords: ['print', 'printing'],                      icon: 'print' },
  { keywords: ['cut', 'cutting'],                         icon: 'content-cut' },
  { keywords: ['lin', 'lining', 'ling'],                  icon: 'layers' },
  { keywords: ['wav', 'waving', 'weav', 'weaving'],       icon: 'waves' },
  { keywords: ['pack', 'packing', 'packaging'],           icon: 'inventory-2' },
  { keywords: ['stitch', 'stitching', 'sew', 'sewing'],  icon: 'straighten' },
  { keywords: ['wash', 'washing'],                        icon: 'local-laundry-service' },
  { keywords: ['knit', 'knitting'],                       icon: 'grain' },
  { keywords: ['embroider', 'embroidery'],                icon: 'star' },
  { keywords: ['iron', 'ironing', 'press', 'pressing'],  icon: 'offline-bolt' },
  { keywords: ['finish', 'finishing'],                    icon: 'check-circle' },
];

function resolveProcessIcon(name: string): string {
  const lower = name.toLowerCase();
  const match = PROCESS_ICONS.find(({ keywords }) => keywords.some(kw => lower.includes(kw)));
  return match?.icon ?? 'settings';
}

// ─── ProcessSelector ──────────────────────────────────────────────────────────

interface ProcessSelectorProps {
  value: Process | null;
  onChange: (process: Process) => void;
}

export function ProcessSelector({ value, onChange }: ProcessSelectorProps) {
  const [processes, setProcesses]   = useState<Process[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName]       = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    getProcesses().then(setProcesses).catch(() => setProcesses([]));
  }, []);

  const handleCreate = useCallback(async () => {
    const trimmed = newName.trim();
    if (!trimmed) { setError('Name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const created = await createProcess(trimmed);
      const process: Process = { id: created.id, name: created.name };
      setProcesses(prev => [...prev, process]);
      onChange(process);
      setModalVisible(false);
      setNewName('');
    } catch {
      setError('Failed to create process. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [newName, onChange]);

  return (
    <>
      <View style={styles.processGrid}>
        {processes.map(item => {
          const selected = value?.id === item.id;
          const icon = resolveProcessIcon(item.name);
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => onChange(item)}
              activeOpacity={0.8}
              style={[styles.processCard, selected && styles.processCardSelected]}
            >
              {selected && (
                <View style={styles.processCheck}>
                  <Icon name="check" size={13} color={colors.primary} />
                </View>
              )}
              <View style={[styles.processIconBox, selected && styles.processIconBoxSelected]}>
                <Icon name={icon} size={28} color={selected ? colors.white : colors.gray600} />
              </View>
              <Text style={[styles.processLabel, selected && styles.processLabelSelected]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Add Process card */}
        <TouchableOpacity
          onPress={() => { setError(null); setNewName(''); setModalVisible(true); }}
          activeOpacity={0.8}
          style={[styles.processCard, styles.addProcessCard]}
        >
          <View style={[styles.processIconBox, styles.addProcessIconBox]}>
            <Icon name="add" size={28} color={colors.primary} />
          </View>
          <Text style={styles.addProcessLabel}>Add Process</Text>
        </TouchableOpacity>
      </View>

      {/* Add-process modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Process</Text>

            <TextInput
              style={[styles.modalInput, !!error && styles.modalInputError]}
              placeholder="e.g. Dyeing, Cutting…"
              placeholderTextColor={colors.gray400}
              value={newName}
              onChangeText={v => { setNewName(v); setError(null); }}
              autoFocus
            />
            {!!error && <Text style={styles.modalErrorText}>{error}</Text>}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSave, saving && styles.modalBtnDisabled]}
                onPress={handleCreate}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Text style={styles.modalBtnSaveText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
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

  // Process grid + cards
  processGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
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
  processLabelSelected: { color: colors.primary },
  processSub: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },

  // Add Process card
  addProcessCard: { borderStyle: 'dashed', borderColor: colors.primary, borderWidth: 1.5 },
  addProcessIconBox: { backgroundColor: colors.primaryLight },
  addProcessLabel: { fontWeight: '700', fontSize: 14, color: colors.primary, marginBottom: spacing.xs },

  // Add-process modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 24 },
  modalCard: { backgroundColor: colors.white, borderRadius: 20, padding: 24, gap: 16 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  modalInput: {
    borderWidth: 1.5, borderColor: colors.gray200, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.textPrimary,
    backgroundColor: colors.backgroundLight,
  },
  modalInputError: { borderColor: colors.danger },
  modalErrorText: { fontSize: 12, color: colors.danger, marginTop: -8 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtnCancel: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.gray200,
    alignItems: 'center',
  },
  modalBtnCancelText: { fontSize: 14, fontWeight: '700', color: colors.gray600 },
  modalBtnSave: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  modalBtnSaveText: { fontSize: 14, fontWeight: '700', color: colors.white },
  modalBtnDisabled: { opacity: 0.6 },

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
