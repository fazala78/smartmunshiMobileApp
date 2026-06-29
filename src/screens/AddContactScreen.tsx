import React, { useState, useMemo, useRef } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, Image, Keyboard,
    Modal, FlatList, TextInput, SafeAreaView as RNSafeAreaView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SwipeButton from 'rn-swipe-button';
import Contacts, { Contact } from 'react-native-contacts';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme';
import InputField from '../components/ui/InputField';
import SelectionButton from '../components/ui/SelectionButton';
import SuccessModal, { SuccessResponse } from './modals/SuccessModal';
import { ContactCategory, ContactCity, ContactForm } from '../types/contact';
import AsyncDropdown from '../components/AsyncDropdown';
import { createContact, fetchAllContacts } from '../services/contactService';
import useCurrency from '../utils/currency';
import Header from '../components/ui/Header';
import FooterError from '../components/common/FooterError';
import { useSuccessSound } from '../utils/useSuccessSound';
import { getLastContactsSyncTime, setLastContactsSyncTime } from '../services/storage';
import { checkContactsPermission, requestContactsPermission } from '../services/contactSyncService';

// ─── Types ────────────────────────────────────────────────────────────────────

type ContactType = 'client' | 'vendor';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'AddContact'>;
};

const CONTACT_TYPES: { key: ContactType; label: string; icon: string }[] = [
    { key: 'client', label: 'Customer', icon: 'person' },
    { key: 'vendor', label: 'Vendor', icon: 'store' },
];

const INITIAL: ContactForm = {
    name: '',
    opn_balance: null,
    type: 'client',
    balance_type: 'receivable',
    phone: '',
    email: '',
    credit_limit: null,
    asset_id: null,
    city: null,
    category: null,
    currency: null,
};

// ─────────────────────────────────────────────────────────────────────────────

const AddContactScreen: React.FC<Props> = ({ navigation }) => {

    const [form, setForm] = useState<ContactForm>(INITIAL);
    const [loading, setLoading] = useState(false);
    const [avatar, setAvatar] = useState<string | null>(null);
    const [success, setSuccess] = useState<SuccessResponse | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [footerError, setFooterError] = useState<string | null>(null);
    const [showContactPicker, setShowContactPicker] = useState(false);
    const [deviceContacts, setDeviceContacts] = useState<Contact[]>([]);
    const [contactSearch, setContactSearch] = useState('');
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [anyDropdownOpen, setAnyDropdownOpen] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const { play } = useSuccessSound();

    const currency = useCurrency();
    let resetSwipe: (() => void) | null = null;

    // ── Helper ────────────────────────────────────────────────────────────────
    const update = (fields: Partial<ContactForm>) =>
        setForm((prev) => ({ ...prev, ...fields }));

    // ── Contact Picker ────────────────────────────────────────────────────────
    const handleImportFromContacts = async () => {
        setShowContactPicker(true);
        setLoadingContacts(true);
        try {
            let hasPermission = await checkContactsPermission();
            if (!hasPermission) {
                hasPermission = await requestContactsPermission();
            }
            if (!hasPermission) {
                setShowContactPicker(false);
                showError('Contacts permission is required to import contacts.');
                return;
            }
            const all = await Contacts.getAll();
            all.sort((a, b) => (a.givenName ?? '').localeCompare(b.givenName ?? ''));
            setDeviceContacts(all);
        } catch (e: any) {
            setShowContactPicker(false);
            showError(e?.message ?? 'Could not load contacts.');
        } finally {
            setLoadingContacts(false);
        }
    };

    const handleSelectContact = (contact: Contact) => {
        const name = [contact.givenName, contact.familyName].filter(Boolean).join(' ');
        const phone = contact.phoneNumbers[0]?.number ?? '';
        const email = contact.emailAddresses[0]?.email ?? '';
        update({ name, phone, email });
        setShowContactPicker(false);
        setContactSearch('');
    };

    const filteredContacts = useMemo(() => {
        const q = contactSearch.trim().toLowerCase();
        if (!q) return deviceContacts;
        return deviceContacts.filter(c => {
            const fullName = [c.givenName, c.familyName].filter(Boolean).join(' ').toLowerCase();
            return fullName.includes(q) || c.phoneNumbers.some(p => p.number.includes(q));
        });
    }, [deviceContacts, contactSearch]);

    // ── Toast ──────────────────────────────────────────────────────────────────
    const showError = (message: string) => {
        setFooterError(message);
        // Auto-clear after 4 s
        setTimeout(() => setFooterError(null), 4000);
    };

    // ── Validation ─────────────────────────────────────────────────────────────
    const validate = (): string[] => {
        const errs: string[] = [];
        if (!form.name.trim()) errs.push('Please enter a name.');
        return errs;
    };

    // ── Success handlers ──────────────────────────────────────────────────────
    // "Add Another" — reset form, stay on screen
    const handleAddAnother = () => {
        setShowSuccess(false);
        setForm(INITIAL);
        setSuccess(null);
    };

    // "Done" — go back
    const handleDone = () => {
        setShowSuccess(false);
        navigation.goBack();
    };

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (loading) return;
        const errs = validate();
        if (errs.length > 0) {
            showError(errs[0]);
            resetSwipe?.();
            return;
        }
        try {
            setLoading(true);
            const response = await createContact({ ...form, currency  });
            play();
            setSuccess(response);
            setShowSuccess(true);
        } catch (error: any) {
            const apiErrors: string[] = [];
            if (error?.response?.data?.errors) {
                Object.values(error.response.data.errors).forEach((msgs: any) => {
                    if (Array.isArray(msgs)) msgs.forEach((m: string) => apiErrors.push(m));
                    else if (typeof msgs === 'string') apiErrors.push(msgs);
                });
            } else {
                apiErrors.push(error?.response?.data?.message ?? 'Something went wrong. Please try again.');
            }
            showError(apiErrors[0]);
        } finally {
            setLoading(false);
            resetSwipe?.();
            const lastContactsSyncTime = getLastContactsSyncTime();
            const now = new Date().toISOString();
            const results = await Promise.allSettled([
                fetchAllContacts({ limit: 30, since: lastContactsSyncTime || undefined }),
            ]);
            // Update sync times only if fetch was successful
            if (results[0].status === 'fulfilled') {
                setLastContactsSyncTime(now);
            }
        }
    };

    const ThumbIcon = () =>
        loading
            ? <ActivityIndicator size="small" color={colors.backgroundDark} />
            : <Icon name="keyboard-double-arrow-right" size={24} color={colors.backgroundDark} />;

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>

            <SuccessModal
                visible={showSuccess}
                response={success}
                onClose={handleAddAnother}
                onDone={handleDone}
                closeLabel="Add Another"
                doneLabel="Done"
            />

            {/* ── Contact Picker Modal ── */}
            <Modal
                visible={showContactPicker}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => { setShowContactPicker(false); setContactSearch(''); }}
            >
                <RNSafeAreaView style={styles.pickerContainer}>
                    {/* Modal Header */}
                    <View style={styles.pickerHeader}>
                        <Text style={styles.pickerTitle}>Select Contact</Text>
                        <TouchableOpacity
                            style={styles.pickerCloseBtn}
                            onPress={() => { setShowContactPicker(false); setContactSearch(''); }}
                            activeOpacity={0.7}
                        >
                            <Icon name="close" size={20} color={colors.gray600} />
                        </TouchableOpacity>
                    </View>

                    {/* Search */}
                    <View style={styles.pickerSearchRow}>
                        <Icon name="search" size={20} color={colors.gray400} style={styles.pickerSearchIcon} />
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

                    {/* List */}
                    {loadingContacts ? (
                        <View style={styles.pickerCenter}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={styles.pickerLoadingText}>Loading contacts…</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredContacts}
                            keyExtractor={(item) => item.recordID}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={filteredContacts.length === 0 ? styles.pickerCenter : undefined}
                            ListEmptyComponent={
                                <Text style={styles.pickerEmptyText}>No contacts found</Text>
                            }
                            renderItem={({ item }) => {
                                const fullName = [item.givenName, item.familyName].filter(Boolean).join(' ') || 'Unnamed';
                                const phone = item.phoneNumbers[0]?.number ?? '';
                                const initials = [item.givenName?.[0], item.familyName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
                                return (
                                    <TouchableOpacity
                                        style={styles.pickerItem}
                                        onPress={() => handleSelectContact(item)}
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

            {/* ── Header ── */}
            <Header title='New Contact' navigation={navigation} />

                <ScrollView
                    ref={scrollViewRef}
                    style={styles.body}
                    contentContainerStyle={styles.bodyContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={anyDropdownOpen ? 'none' : 'on-drag'}
                    automaticallyAdjustKeyboardInsets
                    showsVerticalScrollIndicator={false}>


                    {/* ── Avatar ── */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarOuter}>
                            <View style={styles.avatarInner}>
                                {avatar
                                    ? <Image source={{ uri: avatar }} style={styles.avatarImage} />
                                    : <Icon name="person" size={40} color={colors.gray400} />
                                }
                            </View>
                        </View>
                        <TouchableOpacity style={styles.cameraBtn} activeOpacity={0.8}>
                            <Icon name="photo-camera" size={18} color={colors.backgroundDark} />
                        </TouchableOpacity>
                    </View>

                    {/* ── Identity ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Identity</Text>

                        <View style={styles.nameRow}>
                            <View style={styles.flexOne}>
                                <InputField
                                    bg="white" label="Full Name" type="text"
                                    value={form.name}
                                    onChangeText={(v) => update({ name: v })}
                                    placeholder="Enter name" icon="badge"
                                />
                            </View>
                            <TouchableOpacity
                                style={styles.phoneDirBtn}
                                onPress={handleImportFromContacts}
                                activeOpacity={0.75}
                            >
                                <Icon name="contacts" size={22} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                        <SelectionButton
                            label="Contact Type"
                            options={CONTACT_TYPES}
                            value={form.type}
                            onSelect={(key) => update({ type: key as ContactType })}
                        />

                    </View>

                    {/* ── Initial Balance ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Initial Balance</Text>
                        <View style={styles.row}>
                            <View style={styles.flexOne}>
                                <InputField
                                    bg="white" label="Opening Balance" type="decimal"
                                    value={form.opn_balance?.toString() ?? ''}
                                    onChangeText={(v) => update({ opn_balance: parseFloat(v) || 0 })}
                                    placeholder="0.00" icon="account-balance-wallet"
                                />
                            </View>
                            <View style={styles.flexOne}>
                                <InputField
                                    bg="white" label="Credit Limit" type="decimal"
                                    value={form.credit_limit?.toString() ?? ''}
                                    onChangeText={(v) => update({ credit_limit: parseFloat(v) || null })}
                                    placeholder="0.00" icon="credit-card"
                                />

                            </View>

                        </View>



                        <View style={styles.balanceToggleRow}>
                            <TouchableOpacity
                                style={[styles.balanceToggleBtn, form.balance_type === 'receivable' && styles.balanceToggleBtnActiveDr]}
                                onPress={() => update({ balance_type: 'receivable' })}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.balanceBadge, { backgroundColor: form.balance_type === 'receivable' ? colors.primary : colors.gray400 }]}>
                                    <Text style={[styles.balanceBadgeText, { color: form.balance_type === 'receivable' ? colors.backgroundDark : colors.white }]}>DR</Text>
                                </View>
                                <Text style={[styles.balanceToggleLabel, form.balance_type === 'receivable' && { color: colors.primary }]}>
                                    Receivable
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.balanceToggleBtn, form.balance_type === 'payable' && styles.balanceToggleBtnActiveCr]}
                                onPress={() => update({ balance_type: 'payable' })}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.balanceBadge, { backgroundColor: form.balance_type === 'payable' ? colors.danger : colors.gray400 }]}>
                                    <Text style={[styles.balanceBadgeText, { color: colors.white }]}>CR</Text>
                                </View>
                                <Text style={[styles.balanceToggleLabel, form.balance_type === 'payable' && { color: colors.danger }]}>
                                    Payable
                                </Text>
                            </TouchableOpacity>
                        </View>



                    </View>

                    {/* ── Connectivity ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Connectivity</Text>
                        <InputField
                            bg="white" label="Phone Number" type="phone"
                            value={form.phone}
                            onChangeText={(v) => update({ phone: v })}
                            placeholder="+1 (000) 000-0000" icon="phone-iphone"
                        />
                        <InputField
                            bg="white" label="Email Address" type="email"
                            value={form.email}
                            onChangeText={(v) => update({ email: v })}
                            placeholder="email@domain.com" icon="mail"
                        />
                    </View>



                    {/* ── Location ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Location / Category</Text>
                        <AsyncDropdown
                            url="/search-cities"
                            searchParam="q"
                            minSearchLength={2}
                            creatable
                            leadingIconName='location-city'
                            label="Select City"
                            placeholder="Search City"
                            createLabel="Create City"
                            inputBg={colors.backgroundLight}
                            onSelect={(v) => update({ city: v as unknown as ContactCity })}
                            onOpen={() => {
                                Keyboard.dismiss();
                                setAnyDropdownOpen(true);
                                setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
                            }}
                            onClose={() => setAnyDropdownOpen(false)}
                            value={null} />

                        <AsyncDropdown
                            url="/search-contact-categories"
                            searchParam="q"
                            minSearchLength={2}
                            creatable
                            leadingIconName='local-offer'
                            label="Select Category"
                            placeholder="Search Category"
                            createLabel="Create Category"
                            inputBg={colors.backgroundLight}
                            onSelect={(v) => update({ category: v as unknown as ContactCategory })}
                            onOpen={() => {
                                Keyboard.dismiss();
                                setAnyDropdownOpen(true);
                                setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
                            }}
                            onClose={() => setAnyDropdownOpen(false)}
                            value={null} />

                    </View>

                    <View style={{ height: 32 }} />
                </ScrollView>

                {/* ── Footer ── */}
                <View style={styles.footer}>
                    {footerError ? (
                        <FooterError
                            setFooterError={setFooterError}
                            footerError={footerError}
                        />

                    ) : null}
                    <SwipeButton
                        title={loading ? 'Saving...' : 'Slide to Post'}
                        thumbIconComponent={ThumbIcon}
                        railBackgroundColor={colors.backgroundLight}
                        railBorderColor={colors.primary}
                        railFillBackgroundColor={colors.primary}
                        thumbIconBackgroundColor={colors.primary}
                        thumbIconBorderColor={colors.primary}
                        titleColor={colors.primary}
                        titleFontSize={13}
                        height={52}
                        swipeSuccessThreshold={70}
                        disabled={loading}
                        onSwipeSuccess={handleSubmit}
                        forceReset={(reset: () => void) => { resetSwipe = reset; }}
                    />
                </View>

        </SafeAreaView>
    );
};

export default AddContactScreen;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    backLabel: { fontSize: 17, color: colors.info },
    headerTitle: { fontSize: 17, fontWeight: '800', color: colors.gray900, letterSpacing: -0.3 },
    headerSpacer: { width: 70 },
    body: { flex: 1 },
    bodyContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 8 },
    row: { flexDirection: 'row', gap: 8 },
    flexOne: { flex: 1 },
    toast: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.danger, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, shadowColor: colors.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    toastText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.white, lineHeight: 18 },

    avatarSection: { alignItems: 'center', paddingVertical: 24 },
    avatarOuter: { width: 96, height: 96, borderRadius: 24, borderWidth: 2, borderColor: colors.primaryMuted, padding: 4, backgroundColor: colors.white, shadowColor: colors.shadowSm, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    avatarInner: { flex: 1, borderRadius: 18, backgroundColor: colors.backgroundLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    avatarImage: { width: '100%', height: '100%' },
    cameraBtn: { position: 'absolute', bottom: 18, right: '50%', marginRight: -52, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white, shadowColor: colors.shadowMd, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },

    section: { gap: 12 },
    sectionTitle: { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 1.2, textTransform: 'uppercase', paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: colors.primaryMuted, alignSelf: 'flex-start' },

    balanceToggleRow: { flexDirection: 'row', gap: 10 },
    balanceToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.backgroundLight, borderWidth: 2, borderColor: 'transparent' },
    balanceToggleBtnActiveDr: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
    balanceToggleBtnActiveCr: { backgroundColor: colors.dangerLight, borderColor: colors.danger },
    balanceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    balanceBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    balanceToggleLabel: { fontSize: 11, fontWeight: '800', color: colors.gray500, letterSpacing: 0.8, textTransform: 'uppercase' },

    footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray100 },
    footerHint: { textAlign: 'center', marginTop: 10, fontSize: 10, fontWeight: '800', color: colors.gray400, letterSpacing: 2, textTransform: 'uppercase' },

    nameRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    phoneDirBtn: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.primaryMuted, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

    // Contact Picker Modal
    pickerContainer: { flex: 1, backgroundColor: colors.white },
    pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
    pickerTitle: { fontSize: 17, fontWeight: '800', color: colors.gray900, letterSpacing: -0.3 },
    pickerCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.backgroundLight, alignItems: 'center', justifyContent: 'center' },
    pickerSearchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.backgroundLight, borderRadius: 12, gap: 8 },
    pickerSearchIcon: { },
    pickerSearchInput: { flex: 1, fontSize: 15, color: colors.gray900, padding: 0 },
    pickerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    pickerLoadingText: { marginTop: 12, fontSize: 13, color: colors.gray500 },
    pickerEmptyText: { fontSize: 14, color: colors.gray400, textAlign: 'center' },
    pickerItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.gray100, gap: 14 },
    pickerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    pickerAvatarImg: { width: 44, height: 44 },
    pickerAvatarInitials: { fontSize: 15, fontWeight: '700', color: colors.primary },
    pickerItemInfo: { flex: 1 },
    pickerItemName: { fontSize: 15, fontWeight: '600', color: colors.gray900 },
    pickerItemPhone: { fontSize: 13, color: colors.gray500, marginTop: 2 },
});