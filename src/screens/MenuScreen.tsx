import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Image,
    StatusBar,
    Animated,
    Dimensions,
    Modal,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { logout } from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNavigation from '../components/BottomNavigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
interface LogoutModalProps {
    visible: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

interface MenuItem {
    icon: string;
    label: string;
    bg: string;
    color: string;
}

interface MenuSection {
    title: string;
    items: MenuItem[];
}

interface MenuCardProps {
    item: MenuItem;
    index: number;
}

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Menu'>;
};

// ─── Menu Sections (Inventory → Payments → Reports) ─────────────────────────
const MENU_SECTIONS: MenuSection[] = [
    {
        title: 'INVENTORY & SALES',
        items: [
            { icon: 'description',       label: 'Invoice',          bg: '#faf5ff', color: '#a855f7' },
            { icon: 'shopping_cart',     label: 'Purchase',         bg: '#ecfdf5', color: '#10b981' },
            { icon: 'assignment_return', label: 'Sale\nReturn',     bg: '#ecfeff', color: '#06b6d4' },
            { icon: 'keyboard_return',   label: 'Purchase\nReturn', bg: '#fdf2f8', color: '#ec4899' },
        ],
    },
    {
        title: 'PAYMENTS',
        items: [
            { icon: 'payments',               label: 'Receive\nPayment', bg: '#eff6ff', color: '#3b82f6' },
            { icon: 'account_balance_wallet', label: 'Paid\nPayment',    bg: '#fff7ed', color: '#f97316' },
            { icon: 'account_balance',        label: 'Bank\nPayment',    bg: '#f0fdf4', color: '#22c55e' },
            { icon: 'shopping_bag',           label: 'Expense',          bg: '#fef2f2', color: '#ef4444' },
        ],
    },
    {
        title: 'FINANCIAL REPORTS',
        items: [
            { icon: 'menu_book',   label: 'Journal',        bg: '#eef2ff', color: '#6366f1' },
            { icon: 'event_note',  label: 'Day Book',       bg: '#fffbeb', color: '#f59e0b' },
            { icon: 'trending_up', label: 'P & L',          bg: '#fff1f2', color: '#f43f5e' },
            { icon: 'bar_chart',   label: 'Balance\nSheet', bg: '#f0f9ff', color: '#0ea5e9' },
        ],
    },
];

// ─── Animated Menu Card ───────────────────────────────────────────────────────
const MenuCard: React.FC<MenuCardProps> = ({ item, index }) => {
    const scale   = useRef(new Animated.Value(0.85)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 320,
                delay: index * 50,
                useNativeDriver: true,
            }),
            Animated.spring(scale, {
                toValue: 1,
                delay: index * 50,
                friction: 7,
                tension: 80,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const pressAnim  = useRef(new Animated.Value(1)).current;
    const onPressIn  = () => Animated.spring(pressAnim, { toValue: 0.93, friction: 8, useNativeDriver: true }).start();
    const onPressOut = () => Animated.spring(pressAnim, { toValue: 1,    friction: 8, useNativeDriver: true }).start();

    return (
        <Animated.View
            style={{
                opacity,
                transform: [{ scale: Animated.multiply(scale, pressAnim) }],
                width: (width - 60) / 3,
            }}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                style={styles.card}
            >
                <View style={[styles.iconWrap, { backgroundColor: item.bg }]}>
                    <MaterialIcons name={item.icon} size={24} color={item.color} />
                </View>
                <Text style={styles.cardLabel} numberOfLines={2}>
                    {item.label}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ─── Logout Confirmation Modal ────────────────────────────────────────────────
const LogoutModal: React.FC<LogoutModalProps> = ({ visible, onCancel, onConfirm }) => (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
                <View style={styles.modalIconWrap}>
                    <MaterialIcons name="logout" size={32} color={colors.error} />
                </View>
                <Text style={styles.modalTitle}>Logout</Text>
                <Text style={styles.modalMsg}>
                    Are you sure you want to log out of your account?
                </Text>
                <View style={styles.modalActions}>
                    <TouchableOpacity
                        onPress={onCancel}
                        style={[styles.modalBtn, styles.modalBtnCancel]}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.modalBtnCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onConfirm}
                        style={[styles.modalBtn, styles.modalBtnLogout]}
                        activeOpacity={0.8}
                    >
                        <MaterialIcons name="logout" size={16} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.modalBtnLogoutText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const MenuScreen: React.FC<Props> = ({ navigation }) => {
    const [logoutVisible, setLogoutVisible] = useState<boolean>(false);

    const handleLogout = async (): Promise<void> => {
        setLogoutVisible(false);
        const response = await logout();
        if (response.success) {
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('selectedBranch');
            navigation.replace('Login');
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" />

            {/* ── Header ── */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <View style={styles.avatarRing}>
                        <Image
                            source={{
                                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC0o5sP_DR5aQo-0xCtWIxmC8rZeoamCapl8F8-gGtlcZLG7AcUbZBQXtoblOLPE86HE2DrffXuSHHzFusPBnDHbklYCQ8oL8x68ISLHQBkgJ8G85Y1I7x_GX47Uqonq5epyw6N7al5D2chjUlCInDTP-pcJ0uk9alnMg3K4U_1MAcM8sA876jZZ11KCcuq08vQtOk3aT6YWXgX9XX67VjHNHdrSIVET__Tvyx10C_FgoIYLMw2ZP_NmWH6FkrwMsM2hSEFXTU8ntUX',
                            }}
                            style={styles.avatar}
                        />
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.roleLabel}>Store Manager</Text>
                        <Text style={styles.userName}>Alex Rivera</Text>
                    </View>

                    {/* ── Logout pill — quick access from header ── */}
                    <TouchableOpacity
                        style={styles.logoutPill}
                        onPress={() => setLogoutVisible(true)}
                        activeOpacity={0.8}
                    >
                        <MaterialIcons name="logout" size={14} color={colors.error} />
                        <Text style={styles.logoutPillText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Scrollable Content ── */}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {MENU_SECTIONS.map((section: MenuSection) => (
                    <View key={section.title} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <View style={styles.grid}>
                            {section.items.map((item: MenuItem, i: number) => (
                                <MenuCard key={item.label} item={item} index={i} />
                            ))}
                        </View>
                    </View>
                ))}

              
                <View style={{ height: 28 }} />
            </ScrollView>

            {/* ── Bottom Navigation ── */}
            <BottomNavigation activeRoute="Menu" />

            {/* ── Logout Confirmation Modal ── */}
            <LogoutModal
                visible={logoutVisible}
                onCancel={() => setLogoutVisible(false)}
                onConfirm={handleLogout}
            />
        </SafeAreaView>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.backgroundLight },

    // ── Header
    header: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: colors.white,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.backgroundLight,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    avatarRing: {
        width: 44, height: 44, borderRadius: 22,
        borderWidth: 2, borderColor: colors.primary,
        justifyContent: 'center', alignItems: 'center',
    },
    avatar: { width: 36, height: 36, borderRadius: 18 },
    roleLabel: {
        fontSize: 9, fontWeight: '700', color: colors.textSecondary,
        letterSpacing: 1.5, textTransform: 'uppercase',
    },
    userName: {
        fontSize: 17, fontWeight: '800', color: colors.textPrimary,
        letterSpacing: -0.4, marginTop: 1,
    },

    // ── Logout pill (header)
    logoutPill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: colors.errorBg, borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 7,
        borderWidth: 1, borderColor: 'rgba(239,68,68,0.18)',
    },
    logoutPillText: { fontSize: 12, fontWeight: '700', color: colors.error },

    // ── Scroll
    scroll:        { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },

    // ── Section
    section:      { marginBottom: 28 },
    sectionTitle: {
        fontSize: 10, fontWeight: '700', color: colors.textSecondary,
        letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14, marginLeft: 2,
    },

    // ── Grid
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

    // ── Card
    card: {
        backgroundColor: colors.white,
        borderRadius: 18,
        paddingVertical: 16, paddingHorizontal: 8,
        alignItems: 'center', gap: 10,
        borderWidth: StyleSheet.hairlineWidth, borderColor: colors.backgroundLight,
        shadowColor: '#000', shadowOpacity: 0.04,
        shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    iconWrap:  { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    cardLabel: {
        fontSize: 11, fontWeight: '700', color: colors.textPrimary,
        textAlign: 'center', lineHeight: 15,
    },

    // ── Logout Modal
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
    },
    modalBox: {
        width: '100%', borderRadius: 24,
        backgroundColor: colors.white,
        padding: 28, alignItems: 'center',
        shadowColor: '#000', shadowOpacity: 0.18,
        shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12,
    },
    modalIconWrap: {
        width: 64, height: 64, borderRadius: 20,
        backgroundColor: colors.errorBg,
        justifyContent: 'center', alignItems: 'center', marginBottom: 18,
    },
    modalTitle: {
        fontSize: 20, fontWeight: '800', color: colors.textPrimary,
        marginBottom: 8, letterSpacing: -0.3,
    },
    modalMsg: {
        fontSize: 14, fontWeight: '500', color: colors.textSecondary,
        textAlign: 'center', lineHeight: 21, marginBottom: 28,
    },
    modalActions:       { flexDirection: 'row', gap: 12, width: '100%' },
    modalBtn:           {
        flex: 1, paddingVertical: 14, borderRadius: 14,
        alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
    },
    modalBtnCancel:     { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: colors.backgroundLight },
    modalBtnCancelText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    modalBtnLogout:     { backgroundColor: colors.error },
    modalBtnLogoutText: { fontSize: 14, fontWeight: '700', color: colors.white },
});

export default MenuScreen;