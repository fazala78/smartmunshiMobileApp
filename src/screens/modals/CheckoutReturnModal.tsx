import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Shopping from '../../components/Shopping';
import { Inventory } from '../../types/Inventory';
import { colors } from '../../theme';
import ModalHeader from '../../components/ModalHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CheckoutReturnModalProps {
  visible: boolean;
  payload: Inventory;
  setPayload: React.Dispatch<React.SetStateAction<Inventory | null>>;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CheckoutReturnModal: React.FC<CheckoutReturnModalProps> = ({
  visible,
  payload,
  setPayload,
  onClose,
}) => {
  // Draft — isolated copy so changes are only committed when "Apply" is tapped
  const [draftPayload, setDraftPayload] = useState<Inventory>({ ...payload });

  // Reset draft each time the modal opens
  useEffect(() => {
    if (visible) setDraftPayload({ ...payload });
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = () => {
    setPayload(draftPayload);
    onClose();
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {/*
       * How the height works:
       *
       * overlay     → flex:1, justifyContent:'flex-end'
       *                 fills the screen, pushes children to the bottom
       *
       * sheet       → height:'92%'  ← change this one value to resize
       *                 sits at the bottom, NOT flex:1 so it never fills the screen
       *
       * sheetInner  → flex:1
       *                 absorbs KAV adjustments so the footer stays pinned
       *
       * Tapping the dark area above the sheet (overlay) closes the modal.
       * Tapping inside the sheet (sheetInner Pressable) stops event bubbling.
       */}
      <Pressable style={s.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          style={s.sheet}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={s.sheetInner} onPress={() => {}}>

            <ModalHeader onClose={onClose} title="Add Return Products" />

            <ScrollView
              contentContainerStyle={s.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Shopping
                attribute="mixed_cart"
                payload={draftPayload}
                setPayload={
                  setDraftPayload as React.Dispatch<React.SetStateAction<Inventory | null>>
                }
                listingTitle={null}
              />
            </ScrollView>

            <View style={s.footer}>
              <TouchableOpacity
                style={s.applyBtn}
                onPress={handleApply}
                activeOpacity={0.85}
              >
                <Text style={s.applyBtnText}>Apply Returns</Text>
              </TouchableOpacity>
            </View>

          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({

  // Dims the background and pushes the sheet to the bottom
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  // ↓ Adjust this single value to control how tall the sheet is (e.g. '75%', '85%')
  sheet: {
    height: '94%',
  },

  // Fills the KAV so ScrollView + footer layout correctly
  sheetInner: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  scrollContent: {
    padding: 16,
    gap: 14,
  },

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },

  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  applyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.2,
  },
});