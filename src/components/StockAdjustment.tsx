import React, { useState } from 'react';
import {
  View, Text, Image, TextInput, StyleSheet,
  TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme';
import InputField from './ui/InputField';
import QuantityField from './ui/Quantityfield';
import { adjustStock } from '../services/ProductService';
import FooterError from './common/FooterError';
import DatePickerField from './DatePickerField';
import { toDateString } from '../utils/stringUtils';
import { Product } from '../types/Product';

const StockAdjustment: React.FC<{ onDismiss: () => void; product: Product; adjustment: string }> = ({
  onDismiss, product, adjustment,
}) => {
  const [footerError, setFooterError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localProduct, setLocalProduct] = useState({ ...product, quantity: product.quantity ?? 1 });
  const [adjustmentDate, setAdjustmentDate] = useState<Date | null>(new Date());

  const update = (updates: any) => {
    setLocalProduct({ ...localProduct, ...updates });
  };

  const handleConfirm = async () => {
    setLoading(true);
    setFooterError(null);
    try {
      await adjustStock({ product: localProduct, adjustment, date: toDateString(adjustmentDate as Date) });
      Alert.alert('Success', 'Stock adjustment completed successfully', [
        { text: 'OK', onPress: onDismiss }
      ]);
    } catch (error: any) {
      setFooterError(error.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };
  return (
    
        <View style={styles.container}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={24} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {localProduct && (
              <>
                {/* Product Info */}
                <View style={styles.productInfo}>
                  {localProduct.image || localProduct.image_url ? (
                    <Image
                      source={{ uri: localProduct.image ?? localProduct.image_url }}
                      style={styles.productImage}
                    />
                  ) : (
                    <View style={[styles.productImage, styles.productImagePlaceholder]}>
                      <Icon name="inventory-2" size={22} color={colors.gray300} />
                    </View>
                  )}
                  <View style={styles.productInfoText}>
                    <TextInput
                      style={styles.nameInput}
                      value={localProduct.name}
                      onChangeText={(name) => update({ name })}
                      placeholder="Product name"
                      placeholderTextColor={colors.gray400}
                    />
                    <Text style={styles.productSub}>
                      Default:  ${parseFloat(String(localProduct.price || 0)).toFixed(2)}
                    </Text>
                  </View>
                </View>

               

                {/* Quantity */}

                <View style={styles.row}>
                  <View style={[styles.rowItem, { flex: 2 }]}>
                    <QuantityField
                      value={localProduct.quantity ?? 1}
                      onChange={(qty) => update({ quantity: qty })}
                      min={1}
                    />
                  </View>
                
                </View>





                {/* Price */}
                {adjustment === '+' && (
                  <View style={styles.field}>
                    <InputField
                      bg="white"
                      label="Price per unit"
                      value={String(localProduct.price ?? '')}
                      onChangeText={(v) => {
                        const parsed = parseFloat(v);
                        update({ price: isNaN(parsed) ? 0 : parsed });
                      }}
                      placeholder="0.00"
                      icon="attach-money"
                      type="decimal"
                    />
                  </View>
                )}

                {/* Date */}
                <View style={styles.field}>
                  <DatePickerField
                    label="Adjustment Date"
                    value={adjustmentDate}
                    onChange={setAdjustmentDate}
                    placeholder="Select adjustment date"
                  />
                </View>

                {/* ── Consum Products ── */}
              </>
            )}
          </ScrollView>
            <View style={{ marginTop: 15 }} ></View>
          {footerError && (
            <FooterError
              setFooterError={setFooterError}
              footerError={footerError}
            />
          )}

          {localProduct && (
            <TouchableOpacity
              style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={loading}
            >
              <Icon
                name='check-circle'
                size={20}
                color={colors.white}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.confirmBtnText}>
                {loading ? 'Saving...' : 'Save Adjustment'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
    
  );
};

export default StockAdjustment;

// ─── Colors ───────────────────────────────────────────────────────────────────


// ─── Consum Products Styles ───────────────────────────────────────────────────



// ─── Main Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '800', color: colors.gray900 },
  productInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.backgroundLight, padding: 12, borderRadius: 10,marginBottom: 10 },
  productImage: { width: 52, height: 52, borderRadius: 8, backgroundColor: colors.gray200 },
  productImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  productInfoText: { flex: 1 },
  nameInput: { fontSize: 14, fontWeight: '700', color: colors.gray900, paddingVertical: 4, paddingHorizontal: 0, borderBottomWidth: 1.5, borderBottomColor: colors.gray200, marginBottom: 4 },
  productSub: { fontSize: 12, color: colors.gray500, marginTop: 2 },
  field: { gap: 8, marginTop: 20 },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: colors.textPlaceholder, letterSpacing: 1.2, textTransform: 'uppercase' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundLight, borderRadius: 8, overflow: 'hidden', borderColor: colors.gray200 },
  qtyBtn: { padding: 12, backgroundColor: colors.warning, justifyContent: 'center', alignItems: 'center', borderColor: colors.warning, borderWidth: 1.5 },
  qtyInput: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.gray900, paddingVertical: 12, backgroundColor: colors.backgroundLight, textAlign: 'center', borderColor: colors.gray200, borderWidth: 1.5 },
  taxGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  taxChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: colors.gray200, backgroundColor: colors.backgroundLight, alignItems: 'center', minWidth: 90 },
  taxChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  taxChipText: { fontSize: 13, fontWeight: '700', color: colors.gray700 },
  taxChipRate: { fontSize: 11, color: colors.gray500, marginTop: 1 },
  taxChipTextSelected: { color: '#fff' },
  discountRow: { flexDirection: 'row', gap: 8 },
  discountInput: { flex: 1, backgroundColor: colors.backgroundLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, fontWeight: '600', color: colors.gray900, borderWidth: 1.5, borderColor: colors.gray200 },
  dropdownWrapper: { position: 'relative', zIndex: 10, borderWidth: 1.5, borderColor: colors.gray200, borderRadius: 8 },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, gap: 4, minWidth: 90 },
  dropdownBtnText: { fontSize: 14, fontWeight: '700', color: colors.gray700 },
  dropdownMenu: { position: 'absolute', bottom: 52, right: 0, backgroundColor: '#fff', borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: -2 }, elevation: 6, minWidth: 150, overflow: 'hidden' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  dropdownItemActive: { backgroundColor: '#f0f9ff' },
  dropdownItemText: { fontSize: 14, color: colors.gray700 },
  dropdownItemTextActive: { fontWeight: '700', color: colors.primary },
  summary: { backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, marginTop: 20, alignItems: 'center' },
  summaryText: { fontSize: 15, fontWeight: '700', color: '#166534' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: colors.gray600 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#166534' },
  confirmBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 8, marginTop: 16 },
  confirmBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  validationError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  validationErrorText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '500',
    flex: 1,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  row: { flexDirection: 'row', gap: 12, marginTop:5 },
  rowItem: { flex: 1 },
});