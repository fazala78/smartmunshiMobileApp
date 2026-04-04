import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncDropdown from '../components/AsyncDropdown';
import CheckoutModal from './modals/CheckoutModal';
import Shopping from '../components/Shopping';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import useCurrency, { formatBalance } from '../utils/currency';
import { Inventory } from '../types/Inventory';
import { createInventory } from '../utils/inventoryFactory';
import TransactionSlip from './modals/TransactionSlip';
import PurchaseCheckoutModal from './modals/PurchaseCheckoutModal';
import SaleReturnCheckoutModal from './modals/SaleReturnCheckout';
import PurchaseReturnCheckoutModal from './modals/PurchaseReturnCheckout';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Header from '../components/ui/Header';
import { Contact } from '../types/contact';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Billing'>;
};

const ACTIONS = [
  { label: 'SALE', color: colors.primary, icon: 'shopping-cart', textColor: colors.white },
  { label: 'PURCH.', color: colors.warning, icon: 'shopping-bag', textColor: colors.white },
  { label: 'S-RET.', color: colors.infoDark, icon: 'undo', textColor: colors.white },
  { label: 'P-RET.', color: colors.warning2, icon: 'redo', textColor: colors.white },
] as const;

const BillingScreen: React.FC<Props> = ({ navigation }) => {
  const currency = useCurrency();
  const insets = useSafeAreaInsets(); // used to pad the footer bottom safely
  const [payload, setPayload] = useState<Inventory | null>(null);

  useEffect(() => {
    if (currency) setPayload(createInventory(currency));
  }, [currency]);

  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [checkoutAction, setCheckoutAction] = useState('');
  const [createdSlip, setCreatedSlip] = useState(null);
  const subtotal =
    payload?.cart.reduce(
      (sum, i) => sum + parseFloat(String(i.subtotal || 0)),
      0
    ) ?? 0;

  const handleReceipt = (receipt: any) => {
    setCheckoutModalVisible(false);
    setCreatedSlip(receipt.data);
    if (currency) setPayload(createInventory(currency));
    setTimeout(() => setReceiptModalVisible(true), 400);
  };

  const handleModalClosing = () => {
    setCreatedSlip(null);
    setReceiptModalVisible(false);
  };

  const handleCheckout = (label: string) => {
    if (label === 'SALE' || label === 'S-RET.') {
      const invalidItems = payload?.cart.filter(
        (item) => (item.purchase_taxes ?? []).length > 0
      );
      if (invalidItems && invalidItems.length > 0) {
        Alert.alert(
          'Invalid Taxes',
          `${invalidItems.map((i) => i.name).join(', ')} ${invalidItems.length > 1 ? 'have' : 'has'
          } purchase taxes. Please remove them before proceeding.`
        );
        return;
      }
    }
    if (label === 'PURCH.' || label === 'P-RET.') {
      const invalidItems = payload?.cart.filter(
        (item) => (item.sale_taxes ?? []).length > 0
      );
      if (invalidItems && invalidItems.length > 0) {
        Alert.alert(
          'Invalid Taxes',
          `${invalidItems.map((i) => i.name).join(', ')} ${invalidItems.length > 1 ? 'have' : 'has'
          } Sale taxes. Please remove them before proceeding.`
        );
        return;
      }
    }
    setCheckoutAction(label);
    setCheckoutModalVisible(true);
  };

  return (
    <>
      {/*
       * STRUCTURE:
       *
       * KeyboardAvoidingView  (full screen, flex:1)
       *   └── SafeAreaView    (flex:1, handles notch/status bar)
       *         ├── Header
       *         ├── ScrollView  (flex:1 — grows/shrinks)
       *         └── Footer      (fixed height — always pinned above keyboard)
       *
       * WHY THIS WORKS:
       * KAV sits at the root level — it sees the full screen height and
       * correctly measures the keyboard offset. When the keyboard opens,
       * KAV shrinks its total height. Inside, SafeAreaView fills that
       * shrunk space. The ScrollView (flex:1) absorbs the size change
       * while the footer stays pinned at the new bottom — just above
       * the keyboard.
       *
       * PREVIOUS PROBLEM:
       * KAV was nested inside SafeAreaView. On Android especially, this
       * causes KAV to mis-measure the keyboard offset because SafeAreaView
       * adds inset padding before KAV can calculate available height.
       * Result: footer gets pushed off screen or keyboard overlaps it.
       */}
      <KeyboardAvoidingView
        style={styles.kavRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        // On iOS, if you have a native navigation header, set this to
        // the header height (usually 44–56px). Zero is correct when
        // the header is rendered inside this component (as it is here).
        keyboardVerticalOffset={0}
      >
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

          {/* ── Header ── */}
          <Header title='New Transaction' navigation={navigation} />


          {/* ── Scrollable content ── */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {/* Contact dropdown */}
            <View style={{ zIndex: 3000 }}>
              {payload != null && (
                <AsyncDropdown
                  url="/search-contact"
                  searchParam="q"
                  minSearchLength={4}
                  creatable
                  createLabel="Create contact"
                  inputBg={colors.backgroundLight}
                  value={payload.contact as unknown as Contact}
                  onSelect={(customer) => {
                    setPayload((prev) => {
                      if (!prev) return prev;
                      return { ...prev, contact: customer } as Inventory;
                    });
                  }}
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

          {/*
           * Footer — direct child of SafeAreaView, after the flex:1 ScrollView.
           * It never scrolls away and is never hidden by the keyboard because
           * the KAV at the root shrinks the whole container, not just the scroll.
           *
           * paddingBottom uses the safe area bottom inset so the buttons sit
           * above the home indicator on iPhone / gesture bar on Android.
           * When the keyboard is open the inset is 0 (home bar is hidden),
           * so no wasted space appears between the buttons and the keyboard.
           */}
          <View style={[styles.footer, { paddingBottom: insets.bottom || 8 }]}>
            {/* Total row */}
            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>{formatBalance(subtotal, currency ?? undefined)}</Text>
              </View>
            </View>

            {/* Checkout buttons */}
            <View style={styles.actionButtons}>
              {ACTIONS.map(({ label, color, icon, textColor }) => (
                <TouchableOpacity
                  key={label}
                  style={[styles.actionBtn, { backgroundColor: color }]}
                  onPress={() => handleCheckout(label)}
                  activeOpacity={0.8}
                >
                  <Icon name={icon} size={20} color={textColor} />
                  <Text style={[styles.actionBtnText, { color: textColor }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* ── Checkout Modals — outside KAV so they render full screen ── */}
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

      {/* ── Receipt Modal ── */}
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
            onClose={() => handleModalClosing()}
          />
        )}
      </Modal>
    </>
  );
};

export default BillingScreen;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // KAV is the outermost view — must be flex:1 to fill the screen
  kavRoot: {
    flex: 1,
    backgroundColor: colors.white,
  },

  // SafeAreaView fills KAV; edges excludes 'bottom' because the footer
  // manually applies insets.bottom so the padding collapses to 0 when
  // the keyboard is open (home bar disappears when keyboard is shown).
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },

  // ── Header ──────────────────────────────────────────────────────────────
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

  // ── Scroll area ──────────────────────────────────────────────────────────
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 20, paddingBottom: 16 },

  // ── Footer ───────────────────────────────────────────────────────────────
  footer: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },

  totalsSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLabel: { fontSize: 18, fontWeight: '800', color: colors.gray900 },
  grandTotalValue: { fontSize: 18, fontWeight: '800', color: colors.gray900 },

  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: colors.gray50,
  },

  actionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: colors.backgroundOverlay,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  actionBtnText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});