import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, Modal, TextInput, StyleSheet,
  TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme';
import InputField from '../../components/ui/InputField';
import { getInvoiceItemSubTotal } from '../../utils/lineItemCalculation';
import QuantityField from '../../components/ui/Quantityfield';
import { ConsumableProductsSection } from '../../components/assembly/ConsumableProductsSection';
import AsyncDropdown from '../../components/AsyncDropdown';

export interface AddItemModalProps {
  visible: boolean;
  pendingProduct: any | null;
  editingIndex: number | null;
  onChange: (updated: any) => void;
  onConfirm: () => void;
  onDismiss: () => void;
  configuration: any;
  showPrice?: string;
  attribute?: string
}


// ─── Main Modal ───────────────────────────────────────────────────────────────

const AddItemModal: React.FC<AddItemModalProps> = ({
  visible, pendingProduct, editingIndex,
  onChange, onConfirm, onDismiss, configuration, showPrice, attribute
}) => {
  const isEditing = editingIndex !== null;
  const [discountTypeOpen, setDiscountTypeOpen] = useState(false);
  console.log(pendingProduct);

  const saleTaxes: any[] = configuration?.sale_taxes ?? [];
  const purchaseTaxes: any[] = configuration?.purchase_taxes ?? [];
  const showDiscount: boolean = configuration?.line_discount ?? false;
  const [areConsumProductsValid, setAreConsumProductsValid] = useState(true);
  const [showValidationError, setShowValidationError] = useState(false);

  const hasConsumProducts: boolean =
    Array.isArray(pendingProduct?.consum_products) &&
    pendingProduct.consum_products.length > 0;

  // ── Normalize & calculate subtotal on modal open ──────────────────────────
  useEffect(() => {
    if (visible && pendingProduct) {
      const normalized = {
        ...pendingProduct,
        quantity: parseFloat(String(pendingProduct.quantity)) || 1,
        price: parseFloat(String(pendingProduct.price)) || 0,
        discount: parseFloat(String(pendingProduct.discount)) || 0,
        discount_type: pendingProduct.discount_type ?? 'flat',
        sale_taxes: pendingProduct.sale_taxes ?? [],
        purchase_taxes: pendingProduct.purchase_taxes ?? [],
      };
      normalized.subtotal = getInvoiceItemSubTotal(normalized);
      onChange(normalized);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Core update — always recalculates subtotal ────────────────────────────
  const update = (fields: Partial<any>) => {
    if (!pendingProduct) return;
    const updated = { ...pendingProduct, ...fields };
    updated.subtotal = getInvoiceItemSubTotal(updated);
    onChange(updated);
  };

  // ── Update a single consum_product quantity by id ─────────────────────────
  const handleConsumQtyChange = (id: number, quantity: number | null) => {
    if (!pendingProduct?.consum_products) return;
    const updated = pendingProduct.consum_products.map((cp: any) =>
      cp.id === id ? { ...cp, quantity } : cp
    );
    update({ consum_products: updated });
  };

  // ── Tax toggle ────────────────────────────────────────────────────────────
  const toggleTax = (type: 'sale_taxes' | 'purchase_taxes', tax: any) => {
    if (!pendingProduct) return;
    const current: any[] = pendingProduct[type] ?? [];
    const exists = current.some((t) => t.id === tax.id);
    const updated = exists
      ? current.filter((t) => t.id !== tax.id)
      : [...current, tax];
    if (type === 'sale_taxes') {
      update({ sale_taxes: updated, purchase_taxes: [] });
    } else {
      update({ purchase_taxes: updated, sale_taxes: [] });
    }
  };

  const isTaxSelected = (type: 'sale_taxes' | 'purchase_taxes', taxId: number) =>
    (pendingProduct?.[type] ?? []).some((t: any) => t.id === taxId);




  const handleConfirm = () => {
    // Validate consumable products
    if (hasConsumProducts && !areConsumProductsValid) {
      setShowValidationError(true);
      return;
    }
    setShowValidationError(false);
    onConfirm();
  };


  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{isEditing ? 'Edit Item' : 'Add Item'}</Text>
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={24} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {pendingProduct && (
              <>
                {/* Product Info */}
                <View style={styles.productInfo}>
                  {pendingProduct.image || pendingProduct.image_url ? (
                    <Image
                      source={{ uri: pendingProduct.image ?? pendingProduct.image_url }}
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
                      value={pendingProduct.name}
                      onChangeText={(name) => update({ name })}
                      placeholder="Product name"
                      placeholderTextColor={colors.gray400}
                    />
                    <Text style={styles.productSub}>
                      Default:  ${parseFloat(String(pendingProduct.price || 0)).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {hasConsumProducts && attribute === 'cart' && (
                  <ConsumableProductsSection
                    consumProducts={pendingProduct.consum_products}
                    onQuantityChange={handleConsumQtyChange}
                    onValidityChange={setAreConsumProductsValid}
                  />
                )}

                {/* Quantity */}

                <View style={styles.row}>
                  <View style={[styles.rowItem, { flex: 2 }]}>
                    <QuantityField
                      value={pendingProduct.quantity ?? 1}
                      onChange={(qty) => update({ quantity: qty })}
                      min={1}
                    />
                  </View>
                  {!pendingProduct.id && (
                    <View style={styles.rowItem}>
                    <AsyncDropdown
                      url="/units"
                      searchParam="q"
                      minSearchLength={1}
                      creatable
                      label="Unit"
                      leadingIconName="straighten"
                      inputBg={colors.backgroundLight}
                      onSelect={(v) => update({ unit: v?.symbol as string })} value={null} />
                  </View>
                  )}
                  
                </View>





                {/* Price */}
                {!showPrice && (
                  <View style={styles.field}>
                    <InputField
                      bg="white"
                      label="Price per unit"
                      value={String(pendingProduct.price ?? '')}
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

                {/* Discount */}
                {showDiscount && (
                  <View style={[styles.field, { marginTop: 16 }]}>
                    <Text style={styles.fieldLabel}>Discount</Text>
                    <View style={styles.discountRow}>
                      <TextInput
                        style={styles.discountInput}
                        value={pendingProduct.discount > 0 ? String(pendingProduct.discount) : ''}
                        onChangeText={(v) => {
                          const parsed = parseFloat(v);
                          update({ discount: isNaN(parsed) ? 0 : parsed });
                        }}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={colors.gray400}
                      />
                      <View style={styles.dropdownWrapper}>
                        <TouchableOpacity
                          style={styles.dropdownBtn}
                          onPress={() => setDiscountTypeOpen((o) => !o)}
                        >
                          <Text style={styles.dropdownBtnText}>
                            {pendingProduct.discount_type === 'percentage' ? '%' : '$'}
                          </Text>
                          <Icon
                            name={discountTypeOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
                            size={20}
                            color={colors.gray700}
                          />
                        </TouchableOpacity>
                        {discountTypeOpen && (
                          <View style={styles.dropdownMenu}>
                            {(['flat', 'percentage'] as const).map((type) => (
                              <TouchableOpacity
                                key={type}
                                style={[
                                  styles.dropdownItem,
                                  pendingProduct.discount_type === type && styles.dropdownItemActive,
                                ]}
                                onPress={() => {
                                  update({ discount_type: type });
                                  setDiscountTypeOpen(false);
                                }}
                              >
                                <Text style={[
                                  styles.dropdownItemText,
                                  pendingProduct.discount_type === type && styles.dropdownItemTextActive,
                                ]}>
                                  {type === 'flat' ? 'Flat ($)' : 'Percentage (%)'}
                                </Text>
                                {pendingProduct.discount_type === type && (
                                  <Icon name="check" size={14} color={colors.primary} />
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                )}

                {/* ── Consum Products ── */}


                {/* Sale Taxes */}
                {saleTaxes.length > 0 && (
                  <View style={[styles.field, { marginTop: 16 }]}>
                    <Text style={styles.fieldLabel}>Sale Taxes</Text>
                    <View style={styles.taxGrid}>
                      {saleTaxes.map((tax) => {
                        const selected = isTaxSelected('sale_taxes', tax.id);
                        return (
                          <TouchableOpacity
                            key={tax.id}
                            style={[styles.taxChip, selected && styles.taxChipSelected]}
                            onPress={() => toggleTax('sale_taxes', tax)}
                          >
                            <Text style={[styles.taxChipText, selected && styles.taxChipTextSelected]}>
                              {tax.name}
                            </Text>
                            <Text style={[styles.taxChipRate, selected && styles.taxChipTextSelected]}>
                              {tax.tax_rate}% · {tax.tax_type}
                            </Text>
                            {selected && <Icon name="check" size={14} color={colors.white} style={{ marginTop: 2 }} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Purchase Taxes */}
                {purchaseTaxes.length > 0 && (
                  <View style={[styles.field, { marginTop: 16 }]}>
                    <Text style={styles.fieldLabel}>Purchase Taxes</Text>
                    <View style={styles.taxGrid}>
                      {purchaseTaxes.map((tax) => {
                        const selected = isTaxSelected('purchase_taxes', tax.id);
                        return (
                          <TouchableOpacity
                            key={tax.id}
                            style={[styles.taxChip, selected && styles.taxChipSelected]}
                            onPress={() => toggleTax('purchase_taxes', tax)}
                          >
                            <Text style={[styles.taxChipText, selected && styles.taxChipTextSelected]}>
                              {tax.name}
                            </Text>
                            <Text style={[styles.taxChipRate, selected && styles.taxChipTextSelected]}>
                              {tax.tax_rate}% · {tax.tax_type}
                            </Text>
                            {selected && <Icon name="check" size={14} color={colors.white} style={{ marginTop: 2 }} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Live Subtotal */}
                
                {!showPrice && pendingProduct.subtotal > 0 && (
                  <View style={styles.summary}>
                    <Text style={styles.summaryText}>
                      Subtotal: ${pendingProduct.subtotal.toFixed(2)}
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {showValidationError && (
            <View style={styles.validationError}>
              <Icon name="error" size={16} color={colors.danger} />
              <Text style={styles.validationErrorText}>
                Please fix all raw material quantities before adding to cart.
              </Text>
            </View>
          )}

          {pendingProduct && (
            <TouchableOpacity
              style={[styles.confirmBtn, !areConsumProductsValid && hasConsumProducts && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
            >
              <Icon
                name={isEditing ? 'check-circle' : 'add-shopping-cart'}
                size={20}
                color={colors.white}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.confirmBtnText}>
                {isEditing ? 'Update Item' : 'Add to Cart'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddItemModal;

// ─── Colors ───────────────────────────────────────────────────────────────────


// ─── Consum Products Styles ───────────────────────────────────────────────────



// ─── Main Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '800', color: colors.gray900 },
  productInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.backgroundLight, padding: 12, borderRadius: 10 },
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