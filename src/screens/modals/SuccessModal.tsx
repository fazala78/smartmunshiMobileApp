import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme';
// ─── Types ────────────────────────────────────────────────────────────────────

export interface SuccessResponse {
  title:   string;
  message: string;
}

interface SuccessModalProps {
  visible:  boolean;
  response: SuccessResponse | null;
  onClose:  () => void;
  onDone?:  () => void;  // optional — defaults to onClose if not provided
  closeLabel?: string;   // default: "Add Another"
  doneLabel?:  string;   // default: "Done"
}

// ─────────────────────────────────────────────────────────────────────────────

const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  response,
  onClose,
  onDone,
  closeLabel = 'Add Another',
  doneLabel  = 'Done',
}) => {
  const scaleAnim   = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleDone = () => (onDone ?? onClose)();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>

          {/* Icon */}
          <View style={styles.iconWrap}>
            <Icon name="check-circle" size={56} color={colors.primary} />
          </View>

          {/* Text */}
          <Text style={styles.title}>{response?.title ?? 'Success!'}</Text>
          <Text style={styles.message}>{response?.message}</Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnSecondary} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.btnSecondaryText}>{closeLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleDone} activeOpacity={0.8}>
              <Icon name="arrow-forward" size={16} color={colors.backgroundDark} />
              <Text style={styles.btnPrimaryText}>{doneLabel}</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default SuccessModal;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  card:           { width: '100%', backgroundColor: colors.white, borderRadius: 28, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 16 },
  iconWrap:       { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title:          { fontSize: 22, fontWeight: '900', color: colors.gray900, letterSpacing: -0.5, marginBottom: 8 },
  message:        { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  actions:        { flexDirection: 'row', gap: 12, width: '100%' },
  btnSecondary:   { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 2, borderColor: colors.gray200, alignItems: 'center' },
  btnSecondaryText:{ fontSize: 14, fontWeight: '800', color: colors.gray600 },
  btnPrimary:     { flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnPrimaryText: { fontSize: 14, fontWeight: '800', color: colors.backgroundDark },
});