import React from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
//import type { CartItem } from './CartItemRow';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AddItemModalProps {
  /** Controls Modal visibility */
  visible:       boolean;
  /**
   * The product being added or edited.
   * All fields are strings so they bind directly to TextInput.
   */
  pendingProduct: any | null;
  /**
   * null  → "Add Item" mode
   * number → "Edit Item" mode (the cart index being edited)
   */
  editingIndex:  number | null;
  /** Called when any field changes — parent updates pendingProduct state */
  onChange:      (updated: any) => void;
  /** Confirm button pressed — parent adds or updates the cart */
  onConfirm:     () => void;
  /** Dismiss without saving */
  onDismiss:     () => void;
}

// ─────────────────────────────────────────────────────────────────────────────

const AddItemModal: React.FC<AddItemModalProps> = ({
  visible,
  pendingProduct,
  editingIndex,
  onChange,
  onConfirm,
  onDismiss,
}) => {
  const isEditing = editingIndex !== null;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const update = (fields: Partial<any>) => {
    if (!pendingProduct) return;
    onChange({ ...pendingProduct, ...fields });
  };

  const decrementQty = () => {
    if (!pendingProduct) return;
    update({ quantity: String(Math.max(1, parseInt(pendingProduct.quantity || '1') - 1)) });
  };

  const incrementQty = () => {
    if (!pendingProduct) return;
    update({ quantity: String(parseInt(pendingProduct.quantity || '0') + 1) });
  };

  const subtotal = pendingProduct
    ? parseFloat(pendingProduct.price    || '0') *
      parseInt(pendingProduct.quantity || '0')
    : 0;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEditing ? 'Edit Item' : 'Add Item'}
            </Text>
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={24} color={COLORS.gray600} />
            </TouchableOpacity>
          </View>

          {pendingProduct && (
            <>
              {/* ── Product info ── */}
              <View style={styles.productInfo}>
                {pendingProduct.image || pendingProduct.image_url ? (
                  <Image
                    source={{ uri: pendingProduct.image ?? pendingProduct.image_url }}
                    style={styles.productImage}
                  />
                ) : (
                  <View style={[styles.productImage, styles.productImagePlaceholder]}>
                    <Icon name="inventory-2" size={22} color={COLORS.gray300} />
                  </View>
                )}

                <View style={styles.productInfoText}>
                  {/* Editable name */}
                  <TextInput
                    style={styles.nameInput}
                    value={pendingProduct.name}
                    onChangeText={(name) => update({ name })}
                    placeholder="Product name"
                    placeholderTextColor={COLORS.gray400}
                  />
                  <Text style={styles.productSub}>
                    Default: ${parseFloat(String(pendingProduct.price || 0)).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* ── Quantity ── */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Quantity</Text>
                <View style={styles.quantityRow}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={decrementQty}>
                    <Icon name="remove" size={20} color={COLORS.gray700} />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.qtyInput}
                    value={pendingProduct.quantity}
                    onChangeText={(quantity) => update({ quantity })}
                    keyboardType="numeric"
                    textAlign="center"
                  />

                  <TouchableOpacity style={styles.qtyBtn} onPress={incrementQty}>
                    <Icon name="add" size={20} color={COLORS.gray700} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── Price ── */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Price per unit ($)</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceCurrency}>$</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={pendingProduct.price}
                    onChangeText={(price) => update({ price })}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={COLORS.gray400}
                  />
                </View>
              </View>

              {/* ── Live subtotal ── */}
              {subtotal > 0 && (
                <View style={styles.summary}>
                  <Text style={styles.summaryText}>
                    Subtotal: ${subtotal.toFixed(2)}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* ── Confirm button ── */}
          <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
            <Icon
              name={isEditing ? 'check-circle' : 'add-shopping-cart'}
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.confirmBtnText}>
              {isEditing ? 'Update Item' : 'Add to Cart'}
            </Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddItemModal;

// ─── Colors ──────────────────────────────────────────────────────────────────
const COLORS = {
  brand:   '#13ec5b',
  inputBg: '#f3f4f6',
  gray900: '#111827',
  gray700: '#374151',
  gray600: '#4b5563',
  gray500: '#6b7280',
  gray400: '#9ca3af',
  gray300: '#d1d5db',
  gray200: '#e5e7eb',
} as const;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    gap: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.gray900 },

  // Product info row
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.inputBg,
    padding: 12,
    borderRadius: 10,
  },
  productImage: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: COLORS.gray200,
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfoText: { flex: 1 },

  // Editable name
  nameInput: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray900,
    paddingVertical: 4,
    paddingHorizontal: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.gray200,
    marginBottom: 4,
  },
  productSub: { fontSize: 12, color: COLORS.gray500, marginTop: 2 },

  // Field wrapper
  field:      { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.gray700 },

  // Quantity stepper
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    overflow: 'hidden',
  },
  qtyBtn: {
    padding: 12,
    backgroundColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray900,
    paddingVertical: 12,
    backgroundColor: COLORS.inputBg,
    textAlign: 'center',
  },

  // Price input
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  priceCurrency: { fontSize: 16, color: COLORS.gray500, marginRight: 4 },
  priceInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray900,
    paddingVertical: 12,
  },

  // Live subtotal
  summary:     { backgroundColor: '#f0fdf4', padding: 10, borderRadius: 8, alignItems: 'center' },
  summaryText: { fontSize: 14, fontWeight: '700', color: '#166534' },

  // Confirm button
  confirmBtn: {
    backgroundColor: COLORS.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 4,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});