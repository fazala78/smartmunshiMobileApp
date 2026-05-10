// ShippingModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import InputField from '../../components/ui/InputField'; // adjust path
import { colors } from '../../theme/colors';
import { Inventory } from '../../types/Inventory';
import SwitchField from '../../components/ui/SwitchField';
import ModalHeader from '../../components/ModalHeader';
import LocalDropdown from '../../components/LocallDropdown';
import { Contact } from '../../types/contact';

// ─── Design Tokens (copy from your theme or import) ──────────────────────────


// ─── Types ────────────────────────────────────────────────────────────────────
export interface ShippingInfo {
  shipper?: string;
  amount: number;
  trackingNumber?: string;
  remarks?: string;
  ownerPays: boolean;
}

interface ShippingModalProps {
  visible: boolean;
  payload: Inventory;
  onClose: () => void;
  setPayload: React.Dispatch<React.SetStateAction<any>>;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const CheckoutShippingModal: React.FC<ShippingModalProps> = ({
  visible,
  payload,
  onClose,
  setPayload,
}) => {
  // Local draft state – changes are only applied when user presses "Save"
  const handleSave = () => {
    onClose();
  };
  const handleClose = () => {
    onClose(); // discard changes
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.modalOverlay} onPress={handleClose}>
          <Pressable style={styles.modalSheet} onPress={() => { }}>
            {/* Drag handle */}
            {/* Header */}
            <ModalHeader onClose={handleClose} title='Shipping' />


            {/* Form fields */}
            <ScrollView
              contentContainerStyle={{ gap: 14, padding: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.sectionBody}>
                <LocalDropdown<Contact>
                  label="Contact"
                  inputBg={colors.backgroundLight}
                  value={payload.shipping.shipper}      // ← shows chip if set
                  creatable
                  createLabel="Create contact"
                  onSelect={(customer) =>
                    setPayload((prev: Inventory) =>
                      prev
                        ? { ...prev, shipping: { ...prev.shipping, shipper: customer } } as Inventory
                        : prev
                    )
                  }
                  labelResolver={(c) => c.name}
                  subLabelResolver={(c) => c.phone}
                />


                <InputField bg="white" label="Shipping Cost" type="decimal"
                  value={String(payload?.shipping?.shipping_amount ?? '')}
                  onChangeText={(v) =>
                    setPayload((prev: Inventory) =>
                      prev
                        ? { ...prev, shipping: { ...prev.shipping, shipping_amount: parseFloat(v) } } as Inventory
                        : prev
                    )
                  }
                  placeholder="Enter Amount" icon="attach-money" />
                <InputField bg="white" label="Tracking Number" type="text"
                  value={payload?.shipping?.shipping_ticket ?? ''}
                  onChangeText={(v) =>
                    setPayload((prev: Inventory) =>
                      prev
                        ? { ...prev, shipping: { ...prev.shipping, shipping_ticket: v } } as Inventory
                        : prev
                    )
                  }
                  placeholder="Enter tracking #" icon="qr-code-scanner" autoCapitalize="characters" />
                <InputField bg="white" label="Remarks" type="text"
                  value={payload?.shipping?.remarks ?? ''}
                  onChangeText={(v) =>
                    setPayload((prev: Inventory) =>
                      prev
                        ? { ...prev, shipping: { ...prev.shipping, remarks: v } } as Inventory
                        : prev
                    )
                  }
                  placeholder="Additional notes..." icon="description" multiline numberOfLines={3} />
                <SwitchField
                  labelFalse="Client Pays"
                  labelTrue="We Pays"
                  value={payload?.shipping?.owner_pay_shipping ?? false}
                  onChange={(v) =>
                    setPayload((prev: Inventory) =>
                      prev
                        ? { ...prev, shipping: { ...prev.shipping, owner_pay_shipping: v } } as Inventory
                        : prev
                    )
                  }
                />
              </View>
            </ScrollView>

            {/* Footer with Save button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>Save Shipping</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',          // adjust to '100%' if you want full screen
    overflow: 'hidden',
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.white,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.white + '40',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.white + '40',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  switchSub: {
    fontSize: 12,
    color: colors.white,
    marginTop: 2,
    fontWeight: '500',
  },
  sectionBody: {
    padding: 10,
    gap: 14,
    backgroundColor: colors.white,
  },
});