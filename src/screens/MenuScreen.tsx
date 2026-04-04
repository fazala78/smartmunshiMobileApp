import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Image,
    StatusBar,
    Dimensions,
    Modal,
    Pressable,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { logout } from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNavigation from '../components/BottomNavigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialIcons';


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
    route?: string;
    bg: string;
    color: string;
    screen: string;
}

interface MenuSection {
    title: string;
    items: MenuItem[];
}

interface MenuCardProps {
    item: MenuItem;
    navigation: NativeStackNavigationProp<RootStackParamList>;
}

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Menu'>;
};

// ─── Menu sections ────────────────────────────────────────────────────────────

const MENU_SECTIONS: MenuSection[] = [
    {
        title: 'INVENTORY & SALES',
        items: [
            { icon: 'description', label: 'Sale Invoice', screen: 'inventoryTransaction', route: 'invoice', bg: colors.primaryMuted, color: colors.primary },
            { icon: 'shopping-cart', label: 'Purchase', screen: 'inventoryTransaction', route: 'purchases', bg: colors.warningLight, color: colors.warning },
            { icon: 'undo', label: 'Sale Return', screen: 'inventoryTransaction', route: 'sale-returns', bg: colors.infoLight, color: colors.info },
            { icon: 'redo', label: 'Purchase Return', screen: 'inventoryTransaction', route: 'purchase-returns', bg: colors.purpleLight, color: colors.purple },
        ],
    },
    {
        title: 'PAYMENTS',
        items: [
            { icon: 'account-balance-wallet', label: 'Receive Payment', screen: 'receivePaymentList', route: 'receive-payments', bg: colors.primaryMuted, color: colors.primary },
            { icon: 'send', label: 'Paid Payment', screen: 'receivePaymentList', route: 'pay-payments', bg: colors.dangerLight, color: colors.danger },
            { icon: 'account-balance', label: 'Bank Payment', screen: 'bankPayments', route: 'bank-payment', bg: colors.warningLight, color: colors.warning2 },
            { icon: 'payment', label: 'Expense', screen: 'expensePayment', route: 'expenses', bg: colors.dangerLight, color: colors.danger },
        ],
    },
    {
        title: 'REPORTS',
        items: [
            { icon: 'inventory-2', label: 'Journal', screen: 'Journal', bg: colors.primaryMuted, color: colors.primary },
           
        ],
    },
];

// ─── Menu card ────────────────────────────────────────────────────────────────
// Uses Pressable so we get the `pressed` boolean for instant color feedback
// without any animation — background and icon tint darken on press.

const MenuCard: React.FC<MenuCardProps> = ({ item, navigation }) => {


    const handlePress = () => {
        navigation.navigate(item.screen as keyof RootStackParamList, { item } as any);
    };


    return (
        <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
                styles.card,
                // ── Press effect: darken the card bg and tint the border ──
                pressed && styles.cardPressed,
            ]}
        >
            {({ pressed }) => (
                <>
                    <View style={[
                        styles.iconWrap,
                        { backgroundColor: item.bg },
                        // Slightly darken the icon background on press
                        pressed && styles.iconWrapPressed,
                    ]}>
                        <MaterialIcons
                            name={item.icon}
                            size={24}
                            // Darken the icon color on press for extra feedback
                            color={pressed ? item.color : item.color}
                            style={{ opacity: pressed ? 0.7 : 1 }}
                        />
                    </View>
                    <Text
                        style={[styles.cardLabel, pressed && styles.cardLabelPressed]}
                        numberOfLines={2}
                    >
                        {item.label}
                    </Text>
                </>
            )}
        </Pressable>
    );
};

// ─── Logout modal ─────────────────────────────────────────────────────────────

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

// ─── Screen ───────────────────────────────────────────────────────────────────

const MenuScreen: React.FC<Props> = ({ navigation }) => {
    const [logoutVisible, setLogoutVisible] = useState(false);
    const [user, setUser] = useState<any>(null);



    const loadUserData = useCallback(async () => {
        try {
            const userData = await AsyncStorage.getItem('user');

            if (userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
            }
        } catch (error: any) {
            if (error.response?.status === 401) {
                await AsyncStorage.multiRemove(['authToken', 'user', 'tenant', 'selectedBranch']);
                navigation.replace('Login');
            }
        }
    }, [navigation]);

    useEffect(() => { loadUserData(); }, [loadUserData]);

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

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <View style={styles.avatarRing}>

                        {user?.avatar ? (
                            <Image source={{ uri: user.avatar }} style={styles.avatar} resizeMode="cover" />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Icon name="person" size={24} color={colors.gray500} />
                            </View>
                        )}


                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.roleLabel}>Welcome back</Text>
                        <Text style={styles.userName}>{user?.name || 'User'}</Text>
                    </View>
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

            {/* Scrollable content */}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {MENU_SECTIONS.map((section) => (
                    <View key={section.title} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <View style={styles.grid}>
                            {section.items.map((menuItem) => (
                                <MenuCard
                                    key={menuItem.label}
                                    item={menuItem}
                                    navigation={navigation as any}
                                />
                            ))}
                        </View>
                    </View>
                ))}
                <View style={{ height: 28 }} />
            </ScrollView>

            <BottomNavigation activeRoute="Menu" />

            <LogoutModal
                visible={logoutVisible}
                onCancel={() => setLogoutVisible(false)}
                onConfirm={handleLogout}
            />
        </SafeAreaView>
    );
};

export default MenuScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.backgroundLight },

    // ── Header ────────────────────────────────────────────────────────────────
    header: { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.backgroundLight },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    avatarRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    avatar: { width: 36, height: 36, borderRadius: 18 },
    roleLabel: { fontSize: 9, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase' },
    userName: { textTransform:'capitalize', fontSize: 17, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.4, marginTop: 1 },
    logoutPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.errorBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(239,68,68,0.18)' },
    logoutPillText: { fontSize: 12, fontWeight: '700', color: colors.error },

    // ── Scroll ────────────────────────────────────────────────────────────────
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },

    // ── Section ───────────────────────────────────────────────────────────────
    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14, marginLeft: 2 },

    // ── Grid ──────────────────────────────────────────────────────────────────
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

    // ── Card ──────────────────────────────────────────────────────────────────
    card: {
        width: (width - 60) / 3,
        backgroundColor: colors.white,
        borderRadius: 18,
        paddingVertical: 16,
        paddingHorizontal: 8,
        alignItems: 'center',
        gap: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.backgroundLight,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    // Press state — instant color change, no animation
    cardPressed: {
        backgroundColor: colors.backgroundLight,
        borderColor: colors.gray200,
        // Remove shadow on press for a "sunk" feel
        elevation: 0,
        shadowOpacity: 0,
    },
    iconWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconWrapPressed: {
        // Slightly reduce opacity of the icon background on press
        opacity: 0.75,
    },
    cardLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        lineHeight: 15,
    },
    cardLabelPressed: {
        color: colors.textSecondary,
    },

    // ── Logout modal ──────────────────────────────────────────────────────────
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
    modalBox: { width: '100%', borderRadius: 24, backgroundColor: colors.white, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
    modalIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.errorBg, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 8, letterSpacing: -0.3 },
    modalMsg: { fontSize: 14, fontWeight: '500', color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 28 },
    modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    modalBtnCancel: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: colors.backgroundLight },
    modalBtnCancelText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    modalBtnLogout: { backgroundColor: colors.error },
    modalBtnLogoutText: { fontSize: 14, fontWeight: '700', color: colors.white },
    avatarPlaceholder: { backgroundColor: colors.gray200, justifyContent: 'center', alignItems: 'center' },

});