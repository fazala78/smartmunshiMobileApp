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

export interface CartItemRowProps {
  item: Cart;
  index: number;
  showPrice?: string;
  onPress: (item: Cart, index: number) => void;
  onRemove: (index: number) => void;
}

const CartItemRow: React.FC<CartItemRowProps> = ({ item, index, onPress, onRemove, showPrice }) => {
  const hasSaleTaxes = (item.sale_taxes ?? []).length > 0;
  const hasPurchaseTaxes = (item.purchase_taxes ?? []).length > 0;
  const hasDiscount = item.discount && parseFloat(String(item.discount)) > 0;

  return (
    <TouchableOpacity style={styles.cartItem} onPress={() => onPress(item, index)} activeOpacity={0.7}>

      {/* Thumbnail */}
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.cartItemImage} />
      ) : (
        <View style={[styles.cartItemImage, styles.cartItemImagePlaceholder]}>
          <Icon name="inventory-2" size={22} color={COLORS.gray300} />
        </View>
      )}

      {/* Info */}
      <View style={styles.cartItemInfo}>

        {/* Name + Subtotal */}
        <View style={styles.cartItemRow}>
          <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>

          {!showPrice && (
            <Text style={styles.cartItemTotal}>
              {(item.subtotal ?? 0).toFixed(2)}
            </Text>
          )}
           {showPrice && (
            <Text style={styles.cartItemTotal}>
              {(item.quantity ?? 0).toFixed(2)}
            </Text>
          )}

        </View>

        {/* Qty × price / unit */}
        {!showPrice && (
          <Text style={styles.cartItemSub}>
            {item.quantity} × ${item.price}{item.unit ? ` / ${item.unit}` : ''}
          </Text>
        )}


        {/* Discount */}
        {hasDiscount ? (
          <View style={styles.badgeRow}>
            <View style={styles.discountBadge}>
              <Icon name="local-offer" size={10} color={COLORS.discount} />
              <Text style={styles.discountBadgeText}>
                {item.discount_type === 'percentage'
                  ? `${item.discount}% off`
                  : `-$${parseFloat(String(item.discount)).toFixed(2)}`}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Sale Taxes */}
        {hasSaleTaxes && !showPrice && (
          <View style={styles.badgeRow}>
            {item.sale_taxes!.map((tax) => (
              <View key={tax.id} style={styles.taxBadge}>
                <Text style={styles.taxBadgeText}>
                  {tax.name} {tax.tax_rate}%
                </Text>
                <Text style={styles.taxTypeDot}>
                  {tax.tax_type === 'inclusive' ? 'incl.' : 'excl.'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Purchase Taxes */}
        {hasPurchaseTaxes && !showPrice && (
          <View style={styles.badgeRow}>
            {item.purchase_taxes!.map((tax) => (
              <View key={tax.id} style={[styles.taxBadge, styles.taxBadgePurchase]}>
                <Text style={[styles.taxBadgeText, styles.taxBadgePurchaseText]}>
                  {tax.name} {tax.tax_rate}%
                </Text>
                <Text style={[styles.taxTypeDot, styles.taxBadgePurchaseText]}>
                  {tax.tax_type === 'inclusive' ? 'incl.' : 'excl.'}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.cartItemEditHint}>Tap to edit</Text>
      </View>

      {/* Remove */}
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

const COLORS = {
  brand: colors.primary,
  inputBg: '#f3f4f6',
  gray900: '#111827',
  gray500: colors.textSecondary,
  gray400: colors.textMuted,
  gray300: '#d1d5db',
  discount: '#b45309',
  tax: '#1d4ed8',
  taxPurchase: '#6d28d9',
} as const;

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
  cartItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cartItemName: { fontSize: 14, fontWeight: '700', color: COLORS.gray900, flex: 1, marginRight: 8 },
  cartItemTotal: { fontSize: 14, fontWeight: '700', color: COLORS.gray900 },
  cartItemSub: { fontSize: 12, color: COLORS.gray500 },
  cartItemEditHint: { fontSize: 11, color: COLORS.brand, marginTop: 4 },
  removeBtn: { padding: 4 },

  // Badge row
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },

  // Discount badge
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.discount },

  // Tax badge — sale (blue)
  taxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  taxBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.tax },
  taxTypeDot: { fontSize: 10, color: COLORS.tax },

  // Tax badge — purchase (purple)
  taxBadgePurchase: { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' },
  taxBadgePurchaseText: { color: COLORS.taxPurchase },
});