import React, { useState, useRef } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    KeyboardAvoidingView, ActivityIndicator, Animated, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SwipeButton from 'rn-swipe-button';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme';
import InputField from '../components/ui/InputField';
import SelectionButton from '../components/ui/SelectionButton';

// ─── Types ────────────────────────────────────────────────────────────────────

type ContactType    = 'customer' | 'vendor';
type BalanceType    = 'receivable' | 'payable';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'AddContact'>;
};

const CONTACT_TYPES: { key: ContactType; label: string; icon: string }[] = [
    { key: 'customer', label: 'Customer', icon: 'person' },
    { key: 'vendor',   label: 'Vendor',   icon: 'store' },
];

const INITIAL = {
    name:         '',
    type:         'customer' as ContactType,
    category:     '',
    phone:        '',
    email:        '',
    balance_type: 'receivable' as BalanceType,
    balance:      '',
    city:         '',
    address:      '',
};

// ─────────────────────────────────────────────────────────────────────────────

const AddContactScreen: React.FC<Props> = ({ navigation }) => {

    const [form,    setForm]    = useState(INITIAL);
    const [loading, setLoading] = useState(false);
    const [toast,   setToast]   = useState<string | null>(null);
    const [avatar,  setAvatar]  = useState<string | null>(null);

    const toastAnim  = useRef(new Animated.Value(0)).current;
    let   resetSwipe: (() => void) | null = null;

    // ── Helper ────────────────────────────────────────────────────────────────
    const update = (fields: Partial<typeof INITIAL>) =>
        setForm((prev) => ({ ...prev, ...fields }));

    // ── Toast ──────────────────────────────────────────────────────────────────
    const showToast = (message: string) => {
        setToast(message);
        toastAnim.setValue(0);
        Animated.sequence([
            Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }),
            Animated.delay(3500),
            Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setToast(null));
    };

    // ── Validation ─────────────────────────────────────────────────────────────
    const validate = (): string[] => {
        const errs: string[] = [];
        if (!form.name.trim())  errs.push('Please enter a name.');
        if (!form.phone.trim()) errs.push('Please enter a phone number.');
        return errs;
    };

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (loading) return;
        const errs = validate();
        if (errs.length > 0) {
            showToast(errs[0]);
            resetSwipe?.();
            return;
        }
        try {
            setLoading(true);
            // await createContact(form);
            navigation.goBack();
        } catch (error: any) {
            resetSwipe?.();
            const apiErrors: string[] = [];
            if (error?.response?.data?.errors) {
                Object.values(error.response.data.errors).forEach((msgs: any) => {
                    if (Array.isArray(msgs)) msgs.forEach((m: string) => apiErrors.push(m));
                    else if (typeof msgs === 'string') apiErrors.push(msgs);
                });
            } else {
                apiErrors.push(error?.response?.data?.message ?? 'Something went wrong. Please try again.');
            }
            showToast(apiErrors[0]);
        } finally {
            setLoading(false);
        }
    };

    const ThumbIcon = () =>
        loading
            ? <ActivityIndicator size="small" color={colors.backgroundDark} />
            : <Icon name="keyboard-double-arrow-right" size={24} color={colors.backgroundDark} />;

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="chevron-left" size={24} color={colors.info} />
                    <Text style={styles.backLabel}>Contacts</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Contact</Text>
                <View style={styles.headerSpacer} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}
                    keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                    {/* Toast */}
                    {toast && (
                        <Animated.View style={[styles.toast, {
                            opacity: toastAnim,
                            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
                        }]}>
                            <Icon name="error-outline" size={16} color={colors.white} />
                            <Text style={styles.toastText} numberOfLines={2}>{toast}</Text>
                            <TouchableOpacity onPress={() => setToast(null)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Icon name="close" size={15} color="rgba(255,255,255,0.7)" />
                            </TouchableOpacity>
                        </Animated.View>
                    )}

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

                        <InputField
                            bg="white"
                            label="Full Name"
                            type="text"
                            value={form.name}
                            onChangeText={(v) => update({ name: v })}
                            placeholder="Enter name"
                            icon="badge"
                        />

                        <SelectionButton
                            label="Contact Type"
                            options={CONTACT_TYPES}
                            value={form.type}
                            onSelect={(key) => update({ type: key as ContactType })}
                        />

                        <InputField
                            bg="white"
                            label="Category"
                            type="text"
                            value={form.category}
                            onChangeText={(v) => update({ category: v })}
                            placeholder="e.g. Regular, VIP, Wholesale"
                            icon="label"
                        />
                    </View>

                    {/* ── Connectivity ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Connectivity</Text>

                        <InputField
                            bg="white"
                            label="Phone Number"
                            type="phone"
                            value={form.phone}
                            onChangeText={(v) => update({ phone: v })}
                            placeholder="+1 (000) 000-0000"
                            icon="phone-iphone"
                        />

                        <InputField
                            bg="white"
                            label="Email Address"
                            type="email"
                            value={form.email}
                            onChangeText={(v) => update({ email: v })}
                            placeholder="email@domain.com"
                            icon="mail"
                        />
                    </View>

                    {/* ── Initial Balance ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Initial Balance</Text>

                        {/* DR / CR toggle */}
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

                        <InputField
                            bg="white"
                            label="Opening Balance"
                            type="decimal"
                            value={form.balance}
                            onChangeText={(v) => update({ balance: v })}
                            placeholder="0.00"
                            icon="account-balance-wallet"
                        />
                    </View>

                    {/* ── Location ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Location</Text>

                        <InputField
                            bg="white"
                            label="City"
                            type="text"
                            value={form.city}
                            onChangeText={(v) => update({ city: v })}
                            placeholder="Search city..."
                            icon="location-on"
                        />

                        <InputField
                            bg="white"
                            label="Full Address"
                            type="text"
                            value={form.address}
                            onChangeText={(v) => update({ address: v })}
                            placeholder="Street name, floor, etc..."
                            icon="map"
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <View style={{ height: 32 }} />
                </ScrollView>

                {/* ── Footer ── */}
                <View style={styles.footer}>
                    <SwipeButton
                        title={loading ? 'Saving...' : 'Slide to Post'}
                        thumbIconComponent={ThumbIcon}
                        railBackgroundColor={colors.backgroundLight}
                        railBorderColor={colors.gray200}
                        railFillBackgroundColor={colors.primaryMuted}
                        thumbIconBackgroundColor={loading ? colors.gray400 : colors.primary}
                        thumbIconBorderColor={loading ? colors.gray400 : colors.primary}
                        titleColor={colors.gray400}
                        titleFontSize={13}
                        height={60}
                        swipeSuccessThreshold={70}
                        disabled={loading}
                        onSwipeSuccess={handleSubmit}
                        forceReset={(reset: () => void) => { resetSwipe = reset; }}
                    />
                    <Text style={styles.footerHint}>Confirm &amp; Create Contact</Text>
                </View>
            </KeyboardAvoidingView>

        </SafeAreaView>
    );
};

export default AddContactScreen;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container:    { flex: 1, backgroundColor: colors.white },

    // Header
    header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
    backBtn:      { flexDirection: 'row', alignItems: 'center', gap: 2 },
    backLabel:    { fontSize: 17, color: colors.info },
    headerTitle:  { fontSize: 17, fontWeight: '800', color: colors.gray900, letterSpacing: -0.3 },
    headerSpacer: { width: 70 },

    // Body
    body:         { flex: 1 },
    bodyContent:  { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 8 },

    // Toast
    toast:        { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.danger, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, shadowColor: colors.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    toastText:    { flex: 1, fontSize: 13, fontWeight: '600', color: colors.white, lineHeight: 18 },

    // Avatar
    avatarSection: { alignItems: 'center', paddingVertical: 24 },
    avatarOuter:   { width: 96, height: 96, borderRadius: 24, borderWidth: 2, borderColor: colors.primaryMuted, padding: 4, backgroundColor: colors.white, shadowColor: colors.shadowSm, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    avatarInner:   { flex: 1, borderRadius: 18, backgroundColor: colors.backgroundLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    avatarImage:   { width: '100%', height: '100%' },
    cameraBtn:     { position: 'absolute', bottom: 18, right: '50%', marginRight: -52, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white, shadowColor: colors.shadowMd, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },

    // Section
    section:      { gap: 12 },
    sectionTitle: { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 1.2, textTransform: 'uppercase', paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: colors.primaryMuted, alignSelf: 'flex-start' },

    // Balance toggle
    balanceToggleRow:          { flexDirection: 'row', gap: 10 },
    balanceToggleBtn:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.backgroundLight, borderWidth: 2, borderColor: 'transparent' },
    balanceToggleBtnActivedr:  { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
    balanceToggleBtnActiveDr:  { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
    balanceToggleBtnActiveCr:  { backgroundColor: colors.dangerLight, borderColor: colors.danger },
    balanceBadge:              { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    balanceBadgeText:          { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    balanceToggleLabel:        { fontSize: 11, fontWeight: '800', color: colors.gray500, letterSpacing: 0.8, textTransform: 'uppercase' },

    // Footer
    footer:     { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray100 },
    footerHint: { textAlign: 'center', marginTop: 10, fontSize: 10, fontWeight: '800', color: colors.gray400, letterSpacing: 2, textTransform: 'uppercase' },
});