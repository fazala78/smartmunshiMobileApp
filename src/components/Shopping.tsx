import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProductDropdown from '../components/ProductDropdown';
import CartItemRow from '../components/CartItemRow';
import AddItemModal from '../screens/modals/AddItemModal';
import { colors } from '../theme';
import { Cart, Inventory } from '../types/Inventory';

// ─── Colors ──────────────────────────────────────────────────────────────────
const COLORS = {
  brand:    colors.primary,
  gray900:  '#111827',
  gray700:  '#374151',
  gray600:  '#4b5563',
  gray500:  colors.textSecondary,
  gray400:  colors.textMuted,
  gray200:  '#e5e7eb',
  red:      colors.error,
  amber:    colors.warning,
  blue:     colors.info,
  orange:   colors.warning2,
  emerald:  colors.primary,
};

// ─── Types ────────────────────────────────────────────────────────────────────

/** Only the keys of Inventory whose value is Cart[] */
type CartAttribute = {
  [K in keyof Inventory]: Inventory[K] extends Cart[] ? K : never;
}[keyof Inventory];

export interface ShoppingProps {
  /** Which Inventory array to read/write — e.g. 'cart' | 'mixed_cart' */
  attribute:  CartAttribute;
  payload:    Inventory;
  listingTitle:string | null;
  setPayload: React.Dispatch<React.SetStateAction<Inventory | null>>;
  onConfirm?: () => void;
  onDismiss?: () => void;
}

// ─── Helper — read the correct array from payload ────────────────────────────
const getItems = (payload: Inventory, attribute: CartAttribute): Cart[] =>
  (Array.isArray(payload[attribute]) ? payload[attribute] : []) as Cart[];

// ─────────────────────────────────────────────────────────────────────────────

export default function Shopping({
  payload,
  setPayload,
  attribute,
  listingTitle
}: ShoppingProps) {

  const productDropdownRef = useRef<any>(null);

  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [pendingProduct,      setPendingProduct]      = useState<Cart | null>(null);
  const [editingIndex,        setEditingIndex]        = useState<number | null>(null);

  // ── Current items for the given attribute ─────────────────────────────────
  const items = getItems(payload, attribute);

  // ── Open modal for a NEW product ──────────────────────────────────────────
  const handleProductSelect = (product: any) => {
    if (!product) return;
    setPendingProduct({
      ...product,
      price:    String(parseFloat(String(product.price ?? 0))),
      quantity: '1',
    });
    setEditingIndex(null);
    setAddItemModalVisible(true);
  };

  // ── Open modal to EDIT an existing item ───────────────────────────────────
  const handleCartItemPress = (item: Cart, index: number) => {
    setPendingProduct({ ...item });
    setEditingIndex(index);
    setAddItemModalVisible(true);
  };

  // ── Confirm add / update — always writes to payload[attribute] ────────────
  const handleConfirmItem = () => {
    if (!pendingProduct) return;

    if (editingIndex !== null) {
      // UPDATE existing item at index
      setPayload((prev) => {
        if (!prev) return prev;
        const updated = [...getItems(prev, attribute)];
        updated[editingIndex] = pendingProduct;
        return { ...prev, [attribute]: updated } as Inventory;
      });
    } else {
      // ADD new item
      setPayload((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [attribute]: [...getItems(prev, attribute), pendingProduct],
        } as Inventory;
      });
    }

    setAddItemModalVisible(false);
    setPendingProduct(null);
    setEditingIndex(null);
    if (editingIndex === null) productDropdownRef.current?.reset();
  };

  // ── Dismiss without saving ────────────────────────────────────────────────
  const handleDismissAddItem = () => {
    setAddItemModalVisible(false);
    setPendingProduct(null);
    setEditingIndex(null);
    if (editingIndex === null) productDropdownRef.current?.reset();
  };

  // ── Remove item ───────────────────────────────────────────────────────────
  const handleRemoveItem = (index: number) => {
    setPayload((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [attribute]: getItems(prev, attribute).filter((_, i) => i !== index),
      } as Inventory;
    });
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Product search */}
      <View style={{ zIndex: 2000 }}>
        <ProductDropdown
          ref={productDropdownRef}
          url="/products"
          minSearchLength={3}
          searchParam="term"
          autoReset
          showBarcodeBtn
          onSelect={handleProductSelect}
        />
      </View>

      {/* Item list */}
      <View style={{ zIndex: 1 }}>
        {listingTitle && (
              <Text style={styles.orderTitle}>{listingTitle}</Text>
        )}
      

        {items.length === 0 ? (
          <View style={styles.emptyCart}>
            <Icon name="shopping-cart" size={40} color={COLORS.gray400} />
            <Text style={styles.emptyCartText}>No items added yet</Text>
          </View>
        ) : (
          <View>
            {items.map((item, index) => (
              <View key={`${attribute}-${index}`}>
                {index > 0 && <View style={styles.separator} />}
                <CartItemRow
                  item={item}
                  index={index}
                  onPress={handleCartItemPress}
                  onRemove={handleRemoveItem}
                />
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Add / Edit modal */}
      <AddItemModal
        visible={addItemModalVisible}
        pendingProduct={pendingProduct}
        editingIndex={editingIndex}
        onChange={setPendingProduct}
        onConfirm={handleConfirmItem}
        onDismiss={handleDismissAddItem}
      />
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  orderTitle: {
    fontSize:    11,
    fontWeight:  '700',
    color:       COLORS.gray500,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  emptyCart:     { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyCartText: { fontSize: 14, color: COLORS.gray500 },
  separator:     { height: 1, backgroundColor: COLORS.gray200, marginVertical: 8 },
});