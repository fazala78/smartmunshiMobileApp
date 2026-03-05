import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme';
import { Cart } from '../types/Inventory';

// ─── Types ────────────────────────────────────────────────────────────────────



export interface CartItemRowProps {
  item:      Cart;
  index:     number;
  onPress:   (item: Cart, index: number) => void; // tap row → edit modal
  onRemove:  (index: number) => void;                 // tap × → remove from cart
}

// ─────────────────────────────────────────────────────────────────────────────

const CartItemRow: React.FC<CartItemRowProps> = ({ item, index, onPress, onRemove }) => {
  const lineTotal = (
    parseFloat(String(item.price || 0)) *
    parseFloat(String(item.quantity || 0))
  ).toFixed(2);

  const unitPrice = parseFloat(String(item.price || 0)).toFixed(2);

  return (
    <TouchableOpacity
      style={styles.cartItem}
      onPress={() => onPress(item, index)}
      activeOpacity={0.7}
    >
      {/* ── Thumbnail ── */}
      {item.image_url ? (
        <Image
          source={{ uri:item.image_url }}
          style={styles.cartItemImage}
        />
      ) : (
        <View style={[styles.cartItemImage, styles.cartItemImagePlaceholder]}>
          <Icon name="inventory-2" size={22} color={COLORS.gray300} />
        </View>
      )}

      {/* ── Info ── */}
      <View style={styles.cartItemInfo}>
        <View style={styles.cartItemRow}>
          <Text style={styles.cartItemName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.cartItemTotal}>${lineTotal}</Text>
        </View>

        <Text style={styles.cartItemSub}>
          {item.quantity} × ${unitPrice} / {item.unit}
        </Text>

        <Text style={styles.cartItemEditHint}>Tap to edit</Text>
      </View>

      {/* ── Remove button ── */}
      <TouchableOpacity
        onPress={() => onRemove(index)}
        style={styles.removeBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon name="close" size={18} color={COLORS.gray400} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default CartItemRow;

// ─── Colors ──────────────────────────────────────────────────────────────────
const COLORS = {
  brand:   colors.primary,
  inputBg: '#f3f4f6',
  gray900: '#111827',
  gray500: colors.textSecondary,
  gray400: colors.textMuted,
  gray300: '#d1d5db',
} as const;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  cartItemImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: COLORS.inputBg,
  },
  cartItemImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemInfo: { flex: 1 },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray900,
    flex: 1,
    marginRight: 8,
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  cartItemSub: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  cartItemEditHint: {
    fontSize: 11,
    color: COLORS.brand,
    marginTop: 2,
  },
  removeBtn: { padding: 4 },
});