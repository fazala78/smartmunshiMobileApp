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
import AsyncDropdown from '../components/AsyncDropdown';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'AddProduct'>;
};

const INITIAL = {
    name:           '',
    sku:            '',
    purchase_price: '',
    sale_price:     '',
    category:       null as any,
    tax:            null as any,
    opening_stock:  '',
    unit:           null as any,
};

// ─────────────────────────────────────────────────────────────────────────────

const AddProductScreen: React.FC<Props> = ({ navigation }) => {

    const [form,    setForm]    = useState(INITIAL);
    const [loading, setLoading] = useState(false);
    const [toast,   setToast]   = useState<string | null>(null);
    const [photo,   setPhoto]   = useState<string | null>(null);

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
        if (!form.name.trim())         errs.push('Please enter a product name.');
        if (!form.sale_price.trim())   errs.push('Please enter a sale price.');
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
            // await createProduct(form);
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
            : <Icon name="double-arrow" size={24} color={colors.backgroundDark} />;

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="arrow-back-ios" size={22} color={colors.gray900} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add New Product</Text>
                <TouchableOpacity onPress={handleSubmit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.saveBtn}>Save</Text>
                </TouchableOpacity>
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

                    {/* ── Photo ── */}
                    <View style={styles.photoSection}>
                        <TouchableOpacity style={styles.photoBtn} activeOpacity={0.8}>
                            {photo
                                ? <Image source={{ uri: photo }} style={styles.photoImage} />
                                : <>
                                    <Icon name="add-a-photo" size={36} color={colors.primary} />
                                    <Text style={styles.photoLabel}>Add Photo</Text>
                                </>
                            }
                        </TouchableOpacity>
                    </View>

                    {/* ── Basic Info ── */}
                    <View style={styles.section}>
                        <InputField
                            bg="white"
                            label="Product Name"
                            type="text"
                            value={form.name}
                            onChangeText={(v) => update({ name: v })}
                            placeholder="Enter product name"
                            icon="inventory-2"
                        />

                        <InputField
                            bg="white"
                            label="SKU / Barcode"
                            type="text"
                            value={form.sku}
                            onChangeText={(v) => update({ sku: v })}
                            placeholder="Scan or enter SKU"
                            icon="barcode-reader"
                            rightIcon="qr-code-scanner"
                        />
                    </View>

                    {/* ── Pricing (side by side) ── */}
                    <View style={styles.row}>
                        <View style={styles.rowItem}>
                            <InputField
                                bg="white"
                                label="Purchase Price"
                                type="decimal"
                                value={form.purchase_price}
                                onChangeText={(v) => update({ purchase_price: v })}
                                placeholder="0.00"
                                icon="attach-money"
                            />
                        </View>
                        <View style={styles.rowItem}>
                            <InputField
                                bg="white"
                                label="Sale Price"
                                type="decimal"
                                value={form.sale_price}
                                onChangeText={(v) => update({ sale_price: v })}
                                placeholder="0.00"
                                icon="sell"
                            />
                        </View>
                    </View>

                    {/* ── Category & Tax (side by side) ── */}
                    <View style={styles.row}>
                        <View style={styles.rowItem}>
                            <AsyncDropdown
                                url="/categories"
                                searchParam="q"
                                minSearchLength={2}
                                creatable
                                label="Category"
                                leadingIconName="category"
                                inputBg={colors.backgroundLight}
                                onSelect={(v) => update({ category: v })}
                            />
                        </View>
                        <View style={styles.rowItem}>
                            <AsyncDropdown
                                url="/taxes"
                                searchParam="q"
                                minSearchLength={1}
                                creatable={false}
                                label="Tax Type"
                                leadingIconName="percent"
                                inputBg={colors.backgroundLight}
                                onSelect={(v) => update({ tax: v })}
                            />
                        </View>
                    </View>

                    {/* ── Inventory Initializer ── */}
                    <View style={styles.inventorySection}>
                        <Text style={styles.sectionTitle}>Inventory Initializer</Text>
                        <View style={styles.row}>
                            <View style={[styles.rowItem, { flex: 2 }]}>
                                <InputField
                                    bg="white"
                                    label="Opening Stock"
                                    type="number"
                                    value={form.opening_stock}
                                    onChangeText={(v) => update({ opening_stock: v })}
                                    placeholder="0"
                                    icon="inventory"
                                />
                            </View>
                            <View style={styles.rowItem}>
                                <AsyncDropdown
                                    url="/units"
                                    searchParam="q"
                                    minSearchLength={1}
                                    creatable
                                    label="Unit"
                                    leadingIconName="straighten"
                                    inputBg={colors.backgroundLight}
                                    onSelect={(v) => update({ unit: v })}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={{ height: 32 }} />
                </ScrollView>

                {/* ── Footer ── */}
                <View style={styles.footer}>
                    <SwipeButton
                        title={loading ? 'Saving...' : 'Slide to Save Product'}
                        thumbIconComponent={ThumbIcon}
                        railBackgroundColor={colors.backgroundLight}
                        railBorderColor={colors.gray200}
                        railFillBackgroundColor={colors.primaryMuted}
                        thumbIconBackgroundColor={loading ? colors.gray400 : colors.primary}
                        thumbIconBorderColor={loading ? colors.gray400 : colors.primary}
                        titleColor={colors.gray500}
                        titleFontSize={13}
                        height={64}
                        swipeSuccessThreshold={70}
                        disabled={loading}
                        onSwipeSuccess={handleSubmit}
                        forceReset={(reset: () => void) => { resetSwipe = reset; }}
                    />
                </View>
            </KeyboardAvoidingView>

        </SafeAreaView>
    );
};

export default AddProductScreen;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container:    { flex: 1, backgroundColor: colors.white },

    // Header
    header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
    backBtn:      { width: 48, height: 48, justifyContent: 'center' },
    headerTitle:  { fontSize: 17, fontWeight: '800', color: colors.gray900, letterSpacing: -0.3 },
    saveBtn:      { fontSize: 16, fontWeight: '800', color: colors.primary, minWidth: 48, textAlign: 'right' },

    // Body
    body:         { flex: 1 },
    bodyContent:  { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 16 },

    // Toast
    toast:        { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.danger, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, shadowColor: colors.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    toastText:    { flex: 1, fontSize: 13, fontWeight: '600', color: colors.white, lineHeight: 18 },

    // Photo
    photoSection: { alignItems: 'center', paddingVertical: 24 },
    photoBtn:     { width: 128, height: 128, borderRadius: 64, borderWidth: 2, borderColor: colors.primaryMuted, borderStyle: 'dashed', backgroundColor: colors.backgroundLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 6 },
    photoImage:   { width: '100%', height: '100%' },
    photoLabel:   { fontSize: 13, fontWeight: '800', color: colors.primary },

    // Section
    section:          { gap: 12 },
    inventorySection: { gap: 12, borderTopWidth: 1, borderTopColor: colors.gray100, paddingTop: 16 },
    sectionTitle:     { fontSize: 15, fontWeight: '800', color: colors.gray900 },

    // Side-by-side row
    row:     { flexDirection: 'row', gap: 12 },
    rowItem: { flex: 1 },

    // Footer
    footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray100 },
});