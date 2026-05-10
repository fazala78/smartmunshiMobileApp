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
import { CategoriesType, ProductFormData, unitsType } from '../types/Product';
import { createProduct, fetchAllProducts } from '../services/ProductService';
import SuccessModal, { SuccessResponse } from './modals/SuccessModal';
import Header from '../components/ui/Header';
import FooterError from '../components/common/FooterError';
import { useSuccessSound } from '../utils/useSuccessSound';
import { getLastProductsSyncTime, setLastProductsSyncTime } from '../services/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'AddProduct'>;
};

const INITIAL: ProductFormData = {
    name: '',
    opening_stock: null,
    opening_bags: null,
    price: null,
    cost: null,
    min_price: null,
    sale_taxes: [],
    purchase_taxes: [],
    discount: null,
    barcode: '',
    qty_alert: null,
    unit: null,
    remarks: null,
    asset_id: null,
    categories: [],
    discount_type: 'flat',
    product_type: 'pre-tax-discount'
};

// ─────────────────────────────────────────────────────────────────────────────

const AddProductScreen: React.FC<Props> = ({ navigation }) => {

    const [form, setForm] = useState<ProductFormData>(INITIAL);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const [success, setSuccess] = useState<SuccessResponse | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [footerError, setFooterError] = useState<string | null>(null);
    const { play } = useSuccessSound();


    const toastAnim = useRef(new Animated.Value(0)).current;
    let resetSwipe: (() => void) | null = null;

    // ── Helper ────────────────────────────────────────────────────────────────
    const update = (fields: Partial<typeof INITIAL>) =>
        setForm((prev) => ({ ...prev, ...fields }));

    // ── Toast ──────────────────────────────────────────────────────────────────
    const showError = (message: string) => {
        setFooterError(message);
        // Auto-clear after 4 s
        setTimeout(() => setFooterError(null), 4000);
    };

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

    // ── Validation ─────────────────────────────────────────────────────────────
    const validate = (): string[] => {
        const errs: string[] = [];
        if (!form.name.trim()) errs.push('Please enter a product name.');
        if (!form.price) errs.push('Please enter a sale price.');
        if (!form.cost) errs.push('Please enter a purchase price.');
        if (form.opening_stock === null) errs.push('Please enter a Opening stock.');
        if (!form.unit) errs.push('Select the Product Unit.');
        return errs;
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
            const response = await createProduct(form);
            play();
            setSuccess(response);
            setShowSuccess(true);
            // navigation.goBack();
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
            const lastProductsSyncTime = getLastProductsSyncTime();
            const now = new Date().toISOString();
            const results = await Promise.allSettled([
                fetchAllProducts({ limit: 30, since: lastProductsSyncTime || undefined }),
            ]);

            if (results[0].status === 'fulfilled') {
                setLastProductsSyncTime(now);
            }
        }
    };

    const ThumbIcon = () =>
        loading
            ? <ActivityIndicator size="small" color={colors.backgroundDark} />
            : <Icon name="double-arrow" size={24} color={colors.backgroundDark} />;

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

            {/* ── Header ── */}
            <Header title='New Product' navigation={navigation} />

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
                                    onChangeText={(v) => update({ opening_stock: parseFloat(v) || 0 })}
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
                                    onSelect={(v) => update({ unit: v as unknown as unitsType })} value={null}                                />
                            </View>
                        </View>
                    </View>

                      
                    </View>

                    {/* ── Pricing (side by side) ── */}
                    <View style={styles.row}>
                        <View style={styles.rowItem}>
                            <InputField
                                bg="white"
                                label="Purchase Price"
                                type="decimal"
                                value={form.cost}
                                onChangeText={(v) => update({ cost: parseFloat(v) || 0 })}
                                placeholder="0.00"
                                icon="attach-money"
                            />
                        </View>
                        <View style={styles.rowItem}>
                            <InputField
                                bg="white"
                                label="Sale Price"
                                type="decimal"
                                value={form.price}
                                onChangeText={(v) => update({ price: parseFloat(v) || 0 })}
                                placeholder="0.00"
                                icon="sell"
                            />
                        </View>
                    </View>
                     <InputField
                            bg="white"
                            label="SKU / Barcode"
                            type="text"
                            value={form.barcode}
                            onChangeText={(v) => update({ barcode: v })}
                            placeholder="Scan or enter SKU"
                            icon="barcode-reader"
                        />

                    {/* ── Category & Tax (side by side) ── */}
                    <View style={styles.row}>
                        <View style={styles.rowItem}>
                            <AsyncDropdown
                                url="/categories"
                                searchParam="query"
                                minSearchLength={2}
                                creatable={true}
                                label="Category"
                                leadingIconName="category"
                                inputBg={colors.backgroundLight}
                                // Append to existing array instead of replacing
                                onSelect={(v) => update({ categories: v ? [...(form.categories ?? []), v as unknown as CategoriesType] : [] })} value={null}                            />
                        </View>
                       
                    </View>

                    
                    {/* Remarks */}

                    <InputField
                        bg="white"
                        textAlign="left"
                        label="Remarks"
                        type="text"
                        value={form.remarks ?? ''}
                        onChangeText={(v) => update({ remarks: v })}
                        placeholder="Remarks"
                        icon="description"
                        multiline
                        numberOfLines={3}
                    />

                   

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
                        title={loading ? 'Processing...' : 'Slide to Save Product'}
                        thumbIconComponent={ThumbIcon}
                        railBackgroundColor={colors.primaryLight}
                        railBorderColor={colors.primaryLight}
                        railFillBackgroundColor={colors.primary}
                        thumbIconBackgroundColor={loading ? colors.gray400 : colors.primary}
                        thumbIconBorderColor={loading ? colors.gray400 : colors.primary}
                        titleColor={colors.backgroundDark}
                        titleFontSize={15}
                        height={52}
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
    container: { flex: 1, backgroundColor: colors.white },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
    backBtn: { width: 48, height: 48, justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: colors.gray900, letterSpacing: -0.3 },
    headerSpacer: { width: 70 },
    saveBtn: { fontSize: 16, fontWeight: '800', color: colors.primary, minWidth: 48, textAlign: 'right' },

    // Body
    body: { flex: 1 },
    bodyContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 16 },

    // Toast
    toast: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.danger, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, shadowColor: colors.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    toastText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.white, lineHeight: 18 },

    // Photo
    photoSection: { alignItems: 'center', paddingVertical: 24 },
    photoBtn: { width: 128, height: 128, borderRadius: 64, borderWidth: 2, borderColor: colors.primaryMuted, borderStyle: 'dashed', backgroundColor: colors.backgroundLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 6 },
    photoImage: { width: '100%', height: '100%' },
    photoLabel: { fontSize: 13, fontWeight: '800', color: colors.primary },

    // Section
    section: { gap: 12 },
    inventorySection: { gap: 12,  paddingTop: 16 },
    sectionTitle: { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 1.2, textTransform: 'uppercase', paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: colors.primaryMuted, alignSelf: 'flex-start' },

    // Side-by-side row
    row: { flexDirection: 'row', gap: 12 },
    rowItem: { flex: 1 },

    // Footer
    footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray100 },
});