import React, { useState, useRef, useEffect, SetStateAction, Dispatch } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CartItemRow from '../components/CartItemRow';
import AddItemModal from '../screens/modals/AddItemModal';
import { colors } from '../theme';
import { Cart, ConsumProducts, Inventory } from '../types/Inventory';
import useConfiguration from '../utils/configuration';
import LocalProductDropDown from './LocalProductDropDown';
import ProductDropdown from './ProductDropdown';
import BarcodeScannerModal from './BarcodeScannerModal';
import { LotFormData } from '../types/assembly';
import { StockTransferPayload } from '../types/stockTransfer';
import { searchProductByBarcode } from '../services/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Only the keys of Inventory whose value is Cart[] */
type CartAttribute = {
  [K in keyof Inventory]: Inventory[K] extends Cart[] ? K : never;
}[keyof Inventory];



type ShoppingProps<T extends Inventory | LotFormData | StockTransferPayload> = {
  payload: T;
  setPayload: Dispatch<SetStateAction<T>>;
  attribute: string;
  creatable?: boolean;
  searchingType?: string;
  listingTitle?: string;
  showPrice?: string;
}

// ─── Helper — read the correct array from payload ────────────────────────────


const getItems = <T extends Inventory | LotFormData>(payload: T, attribute: string): Cart[] => {
  return (payload[attribute as keyof T] as Cart[]) ?? [];
};
// ─────────────────────────────────────────────────────────────────────────────

export default function Shopping<T extends Inventory | LotFormData | StockTransferPayload>({
  payload,
  setPayload,
  attribute,
  listingTitle,
  searchingType,
  showPrice,
  creatable
}: ShoppingProps<T>) {

  const productDropdownRef = useRef<any>(null);

  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Cart | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [barcodeScannerVisible, setBarcodeScannerVisible] = useState(false);
  const configuration = useConfiguration();



  // ── Current items for the given attribute ─────────────────────────────────
  const items = getItems(payload as Inventory, attribute as CartAttribute);


  // ── Open modal for a NEW product ──────────────────────────────────────────
  const handleProductSelect = (product: Cart) => {
    if (!product) return;
    const lotPayload = payload as LotFormData;

    setPendingProduct({
      ...product,
      price: parseFloat(String(product.price ?? 0)),
      quantity: 1,
      ...(lotPayload?.consum_products
        ? { consum_products: lotPayload.consum_products as ConsumProducts[] }
        : {}),
    });
    setEditingIndex(null);
    setAddItemModalVisible(true);
  };

  // ── Open modal to EDIT an existing item ───────────────────────────────────


  const handleCartItemPress = (item: Cart, index: number) => {
    let updatedItem = { ...item };

    if (item.consum_products && item.consum_products.length > 0) {
      const lotPayload = payload as LotFormData;

      const updatedConsumProducts = item.consum_products.map(cp => {
        const globalProd = lotPayload.consum_products?.find(p => p.id === cp.id);
        return {
          ...cp,
          totalConsumed: globalProd?.totalConsumed ?? cp.totalConsumed,
        };
      }) as ConsumProducts[];

      updatedItem = { ...updatedItem, consum_products: updatedConsumProducts };
    }

    setPendingProduct(updatedItem);
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
      return { ...prev, [attribute]: updated } as unknown as T;
    });
  } else {
    // ADD new item
    setPayload((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [attribute]: [...getItems(prev, attribute), pendingProduct],
      } as unknown as T;
    });
  }

  setAddItemModalVisible(false);
  setPendingProduct(null);
  setEditingIndex(null);
  if (editingIndex === null) productDropdownRef.current?.reset();
};



  // ── Barcode scan result ───────────────────────────────────────────────────
  const handleBarcodeScanned = (barcode: string) => {
    setBarcodeScannerVisible(false);
    const product = searchProductByBarcode(barcode);
    if (!product) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`No product found for barcode: ${barcode}`, ToastAndroid.SHORT);
      } else {
        Alert.alert('Not Found', `No product found for barcode: ${barcode}`);
      }
      return;
    }
    const lotPayload = payload as LotFormData;
    setPendingProduct({
      ...product,
      price: parseFloat(String(product.price ?? 0)),
      quantity: 1,
      ...(lotPayload?.consum_products
        ? { consum_products: lotPayload.consum_products as ConsumProducts[] }
        : {}),
    });
    setEditingIndex(null);
    setAddItemModalVisible(true);
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
      } as unknown as T;
    });
  };



  useEffect(() => {

    const updated = handleConsumProductUpdate();
    if (updated) {
      setPayload({ ...payload, consum_products: updated });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload.cart]);

  

  const handleConsumProductUpdate = () => {
  const lotPayload = payload as LotFormData;

  // Calculate total usage for each product
  const totalUsage: Record<number, number> = {};

  lotPayload.cart.forEach(cartItem => {
    cartItem.consum_products?.forEach(consumProduct => {
      if (consumProduct.id) {
        totalUsage[consumProduct.id] = (totalUsage[consumProduct.id] || 0) + consumProduct.quantity;
      }
    });
  });

  // Update consum_products
  const updated = lotPayload.consum_products?.map(product => ({
    ...product,
    totalConsumed: totalUsage[product.id] || 0,
  }));

  return updated;
};


  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Product search */}
      <View style={{ zIndex: 2000 }}>
        {searchingType ? (
          <ProductDropdown
            ref={productDropdownRef}
            url="/products"
            creatable={creatable}
            createLabel="Create"
            minSearchLength={3}
            searchParam="term"
            autoReset
            showBarcodeBtn
            onSelect={handleProductSelect}
          />
        ) : (
          <LocalProductDropDown
            label="Add Items"
            placeholder="Search products or SKU..."
            showBarcodeBtn={true}
            onBarcodePress={() => setBarcodeScannerVisible(true)}
            autoReset={true}
            zIndex={3000}
            onSelect={handleProductSelect}
          />
        )}
      </View>

      {/* Item list */}
      <View style={{ zIndex: 1 }}>
        {listingTitle && (
          <Text style={styles.orderTitle}>{listingTitle}</Text>
        )}


        {items.length === 0 ? (
          <View style={styles.emptyCart}>
            <Icon name="shopping-cart" size={40} color={colors.gray400} />
            <Text style={styles.emptyCartText}>No items added yet</Text>
          </View>
        ) : (
          <View>
            {items.map((item, index) => (
              <View key={`${attribute}-${index}`}>
                {index > 0 && <View style={styles.separator} />}
                <CartItemRow
                  showPrice={showPrice}
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
        configuration={configuration}
        showPrice={showPrice}
        attribute={attribute}
      />

      {/* Barcode scanner */}
      <BarcodeScannerModal
        visible={barcodeScannerVisible}
        onClose={() => setBarcodeScannerVisible(false)}
        onBarcodeScanned={handleBarcodeScanned}
      />
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  orderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray500,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  emptyCart: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyCartText: { fontSize: 14, color: colors.gray500 },
  separator: { height: 1, backgroundColor: colors.gray200, marginVertical: 8 },
});