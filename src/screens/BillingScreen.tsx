import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncDropdown from '../components/AsyncDropdown';
import CheckoutModal from './modals/CheckoutModal';
import Shopping from '../components/Shopping';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import useCurrency from '../utils/currency';
import { Inventory } from '../types/Inventory';
import { createInventory } from '../utils/inventoryFactory';
import TransactionSlip from './modals/TransactionSlip';
import PurchaseCheckoutModal from './modals/PurchaseCheckoutModal';
import SaleReturnCheckoutModal from './modals/SaleReturnCheckout';
import PurchaseReturnCheckoutModal from './modals/PurchaseReturnCheckout';

export default function BillingScreen({ navigation }: any) {

  const currency = useCurrency();
  const [payload, setPayload] = useState<Inventory | null>(null);

  useEffect(() => {
    if (currency) setPayload(createInventory(currency));
  }, [currency]);

  // ── Checkout Modal ─────────────────────────────────────────────────────────
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [checkoutAction, setCheckoutAction] = useState('');
  const [createdSlip, setCreatedSlip] = useState(null);

  // ── Derived totals — no useEffect needed ──────────────────────────────────
  const subtotal = payload?.cart.reduce(
    (sum, i) => sum + parseFloat(String(i.price || 0)) * parseFloat(String(i.quantity || 0)),
    0
  ) ?? 0;

 const handleReceipt = (receipt: any) => {
  setCheckoutModalVisible(false);
  console.log(receipt);
  setCreatedSlip(receipt);
  
   if (currency) setPayload(createInventory(currency));

  // Wait for CheckoutModal slide-down animation to finish
  setTimeout(() => {
    setReceiptModalVisible(true);
  }, 400);  // 400ms matches the modal dismiss animation
};

  const handleModalCloing = () => {
    setCreatedSlip(null);
    setReceiptModalVisible(false);

  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
    <SafeAreaView style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack?.()}>
            <Icon name="chevron-left" size={28} color={colors.gray900} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Sale</Text>
        </View>
      </View>

      {/* ── Main Content ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {/* Contact */}
        <View style={{ zIndex: 3000 }}>
          {payload != null && (
            <AsyncDropdown
              url="/search-contact"
              searchParam="q"
              minSearchLength={4}
              creatable
              createLabel="Create contact"
              inputBg={colors.backgroundLight}
              onSelect={(customer) =>
                setPayload((prev) => {
                  if (!prev) return prev;
                  return { ...prev, contact: customer } as Inventory;
                })
              }
            />
          )}
        </View>

        {/* Cart */}
        {payload && (
          <Shopping
            attribute="cart"
            payload={payload}
            setPayload={setPayload}
            listingTitle="CURRENT ORDER"
          />
        )}
      </ScrollView>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>${subtotal.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          {[
            { label: 'SALE', color: colors.primary, icon: 'shopping-cart', textColor: colors.white },
            { label: 'PURCH.', color: colors.warning, icon: 'shopping-bag', textColor: colors.white },
            { label: 'S-RET.', color: colors.infoDark, icon: 'undo', textColor: colors.white },
            { label: 'P-RET.', color: colors.warning2, icon: 'redo', textColor: colors.white },
          ].map(({ label, color, icon, textColor }) => (
            <TouchableOpacity
              key={label}
              style={[styles.actionBtn, { backgroundColor: color }]}
              onPress={() => { setCheckoutAction(label); setCheckoutModalVisible(true); }}
              activeOpacity={0.8}
            >
              <Icon name={icon} size={22} color={textColor} />
              <Text style={[styles.actionBtnText, { color: textColor }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Checkout Modal ── */}
      {checkoutAction === 'SALE' && payload && (
        <CheckoutModal
          visible={checkoutModalVisible}
          payload={payload}
          setPayload={setPayload}
          onConfirm={(invoice) => handleReceipt(invoice)}
          onDismiss={() => setCheckoutModalVisible(false)}
        />
      )}

       {checkoutAction === 'PURCH.' && payload && (
        <PurchaseCheckoutModal
          visible={checkoutModalVisible}
          payload={payload}
          setPayload={setPayload}
          onConfirm={(invoice) => handleReceipt(invoice)}
          onDismiss={() => setCheckoutModalVisible(false)}
        />
      )}
       {checkoutAction === 'S-RET.' && payload && (
        <SaleReturnCheckoutModal
          visible={checkoutModalVisible}
          payload={payload}
          setPayload={setPayload}
          onConfirm={(invoice) => handleReceipt(invoice)}
          onDismiss={() => setCheckoutModalVisible(false)}
        />
      )}

       {checkoutAction === 'P-RET.' && payload && (
        <PurchaseReturnCheckoutModal
          visible={checkoutModalVisible}
          payload={payload}
          setPayload={setPayload}
          onConfirm={(invoice) => handleReceipt(invoice)}
          onDismiss={() => setCheckoutModalVisible(false)}
        />
      )}


    </SafeAreaView>
      <Modal
        visible={receiptModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptModalVisible(false)}
        statusBarTranslucent
      >
        {createdSlip && (
          <TransactionSlip
            transaction={createdSlip}
            visible={receiptModalVisible}
            onClose={() => handleModalCloing()}
          />
        )}

      </Modal>
      </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { padding: 4, borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.gray900 },

  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 20, paddingBottom: 8 },

  footer: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray200 },
  totalsSection: { padding: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  grandTotalLabel: { fontSize: 18, fontWeight: '800', color: colors.gray900 },
  grandTotalValue: { fontSize: 18, fontWeight: '800', color: colors.gray900 },

  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: colors.gray50,
  },
  actionBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    shadowColor: colors.backgroundOverlay,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionBtnText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
});