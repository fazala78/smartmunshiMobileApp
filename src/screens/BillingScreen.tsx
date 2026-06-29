import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  SafeAreaView as RNSafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
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
import LocalDropdown from '../components/LocallDropdown';
import Contacts, { Contact as DeviceContact } from 'react-native-contacts';
import { checkContactsPermission, requestContactsPermission } from '../services/contactSyncService';
import { getAllContacts } from '../services/storage';

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

  const [showContactPicker, setShowContactPicker] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);
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

  // ── Phone Directory ──────────────────────────────────────────────────────────
  const handleOpenPhoneDirectory = async () => {
    if (loadingContacts) return;
    try {
      let hasPermission = await checkContactsPermission();
      if (!hasPermission) hasPermission = await requestContactsPermission();
      if (!hasPermission) return;

      setShowContactPicker(true);
      setLoadingContacts(true);
      const all = await Contacts.getAll();
      all.sort((a, b) => (a.givenName ?? '').localeCompare(b.givenName ?? ''));
      setDeviceContacts(all);
    } catch (e: any) {
      setShowContactPicker(false);
      Alert.alert('Error', e?.message ?? 'Could not load contacts.');
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSelectDeviceContact = (contact: DeviceContact) => {
    const name = [contact.givenName, contact.familyName].filter(Boolean).join(' ').trim();
    const phone = contact.phoneNumbers[0]?.number ?? '';

    const existing = getAllContacts();

    // 1. Exact name match (case-insensitive)
    let match = existing.find(c => c.name.toLowerCase() === name.toLowerCase());

    // 2. Phone match as fallback (digits-only comparison)
    if (!match && phone) {
      const digits = phone.replace(/\D/g, '');
      match = existing.find(c => c.phone?.replace(/\D/g, '') === digits);
    }

    const appContact = match ?? ({ name, phone } as unknown as Contact);
    setPayload((prev) => prev ? { ...prev, contact: appContact } as Inventory : prev);
    setShowContactPicker(false);
    setContactSearch('');
  };

  const filteredDeviceContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return deviceContacts;
    return deviceContacts.filter(c => {
      const fullName = [c.givenName, c.familyName].filter(Boolean).join(' ').toLowerCase();
      return fullName.includes(q) || c.phoneNumbers.some(p => p.number.includes(q));
    });
  }, [deviceContacts, contactSearch]);

  return (
    <>
      {/* ── Phone Directory Modal ── */}
      <Modal
        visible={showContactPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowContactPicker(false); setContactSearch(''); }}
      >
        <RNSafeAreaView style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Phone Directory</Text>
            <TouchableOpacity
              style={styles.pickerCloseBtn}
              onPress={() => { setShowContactPicker(false); setContactSearch(''); }}
              activeOpacity={0.7}
            >
              <Icon name="close" size={20} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerSearchRow}>
            <Icon name="search" size={20} color={colors.gray400} />
            <TextInput
              style={styles.pickerSearchInput}
              placeholder="Search name or phone..."
              placeholderTextColor={colors.gray400}
              value={contactSearch}
              onChangeText={setContactSearch}
              autoCorrect={false}
            />
            {contactSearch.length > 0 && (
              <TouchableOpacity onPress={() => setContactSearch('')} activeOpacity={0.7}>
                <Icon name="cancel" size={18} color={colors.gray400} />
              </TouchableOpacity>
            )}
          </View>

          {loadingContacts ? (
            <View style={styles.pickerCenter}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.pickerLoadingText}>Loading contacts…</Text>
            </View>
          ) : (
            <FlatList
              data={filteredDeviceContacts}
              keyExtractor={(item) => item.recordID}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={filteredDeviceContacts.length === 0 ? styles.pickerCenter : undefined}
              ListEmptyComponent={<Text style={styles.pickerEmptyText}>No contacts found</Text>}
              renderItem={({ item }) => {
                const fullName = [item.givenName, item.familyName].filter(Boolean).join(' ') || 'Unnamed';
                const phone = item.phoneNumbers[0]?.number ?? '';
                const initials = [item.givenName?.[0], item.familyName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
                return (
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => handleSelectDeviceContact(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.pickerAvatar}>
                      {item.hasThumbnail && item.thumbnailPath ? (
                        <Image source={{ uri: item.thumbnailPath }} style={styles.pickerAvatarImg} />
                      ) : (
                        <Text style={styles.pickerAvatarInitials}>{initials}</Text>
                      )}
                    </View>
                    <View style={styles.pickerItemInfo}>
                      <Text style={styles.pickerItemName} numberOfLines={1}>{fullName}</Text>
                      {phone ? <Text style={styles.pickerItemPhone} numberOfLines={1}>{phone}</Text> : null}
                    </View>
                    <Icon name="chevron-right" size={20} color={colors.gray300} />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </RNSafeAreaView>
      </Modal>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

        {/* ── Header ── */}
        <Header title='New Transaction' navigation={navigation} />

        {/* ── Scrollable content ──
            automaticallyAdjustKeyboardInsets adjusts the scroll content inset
            when the keyboard opens so every input stays reachable by scrolling,
            without pushing the footer up above the keyboard. */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          nestedScrollEnabled
        >
          {/* Contact dropdown + phone directory */}
          <View style={{ zIndex: 3000 }}>
            {payload != null && (
              <>
                <Text style={styles.contactLabel}>Contact</Text>
                <View style={styles.contactRow}>
                  <View style={styles.contactDropdownWrap}>
                    <LocalDropdown<Contact>
                      showLabel={false}
                      inputBg={colors.backgroundLight}
                      value={payload.contact}
                      creatable
                      createLabel="Create contact"
                      onSelect={(customer) => {
                        setPayload((prev) => {
                          if (!prev) return prev;
                          return { ...prev, contact: customer } as Inventory;
                        });
                      }}
                      labelResolver={(c) => c.name}
                      subLabelResolver={(c) => c.phone}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.phoneDirBtn}
                    onPress={handleOpenPhoneDirectory}
                    disabled={loadingContacts}
                    activeOpacity={0.75}
                  >
                    <Icon name="contacts" size={22} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </>
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

        {/* Footer — sits at the natural bottom of the screen and stays
            behind the keyboard when it is open. The safe-area bottom
            padding collapses to 0 automatically when the home bar is
            hidden by the keyboard, so no gap appears. */}
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

      {/* ── Checkout Modals ── */}
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

  // ── Contact row (dropdown + phone dir button) ─────────────────────────────
  contactLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textPlaceholder,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  contactDropdownWrap: { flex: 1 },
  phoneDirBtn: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Phone Directory Modal ─────────────────────────────────────────────────
  pickerContainer: { flex: 1, backgroundColor: colors.white },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  pickerTitle: { fontSize: 17, fontWeight: '800', color: colors.gray900, letterSpacing: -0.3 },
  pickerCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center', justifyContent: 'center',
  },
  pickerSearchRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: colors.backgroundLight,
    borderRadius: 12, gap: 8,
  },
  pickerSearchInput: { flex: 1, fontSize: 15, color: colors.gray900, padding: 0 },
  pickerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  pickerLoadingText: { marginTop: 12, fontSize: 13, color: colors.gray500 },
  pickerEmptyText: { fontSize: 14, color: colors.gray400, textAlign: 'center' },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.gray100, gap: 14,
  },
  pickerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  pickerAvatarImg: { width: 44, height: 44 },
  pickerAvatarInitials: { fontSize: 15, fontWeight: '700', color: colors.primary },
  pickerItemInfo: { flex: 1 },
  pickerItemName: { fontSize: 15, fontWeight: '600', color: colors.gray900 },
  pickerItemPhone: { fontSize: 13, color: colors.gray500, marginTop: 2 },
});