import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import BottomNavigation from '../components/BottomNavigation';
import { colors } from '../theme';

const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuickAction {
  id: number;
  route: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  backgroundColor: string;
  isFeatured?: boolean;
}

interface Branch {
  id: number;
  name: string;
  address: string | null;
  is_showroom: boolean;
  created_at: string;
  updated_at: string;
  description: string | null;
  pivot?: { user_id: number; branch_id: number };
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

// ─── Quick Actions ────────────────────────────────────────────────────────────

const quickActions: QuickAction[] = [
  { id: 1, route: 'Billing', title: 'Billing', subtitle: 'New Sale', icon: 'receipt', color: colors.dangerLight, backgroundColor: colors.dangerLight, isFeatured: true },
  { id: 2, route: 'PayExpense', title: 'Expense', subtitle: 'Pay Expenses', icon: 'payment', color: colors.danger, backgroundColor: colors.dangerLight },
  { id: 3, route: 'ReceivePayment', title: 'Receive Pmt', subtitle: 'Sale Return', icon: 'account-balance-wallet', color: colors.primary, backgroundColor: colors.primaryLight },
  { id: 4, route: 'PayPayment', title: 'Paid Pmt', subtitle: 'Purchase Ret.', icon: 'send', color: colors.warning2, backgroundColor: '#FFEDD5' },
  { id: 5, route: 'ChequeList', title: 'Cheques', subtitle: 'Management', icon: 'book', color: colors.info, backgroundColor: colors.infoLight },
  { id: 6, route: 'BankTransaction', title: 'Bank', subtitle: 'Reconcile', icon: 'account-balance', color: '#8B5CF6', backgroundColor: '#EDE9FE' },
  { id: 7, route: 'AddContact',title: 'Add Contact', subtitle: 'CRM', icon: 'person-add', color: '#8B5CF6', backgroundColor: '#EDE9FE' },
  { id: 8, route: 'AddProduct',title: 'Add Product', subtitle: 'Inventory', icon: 'inventory', color: '#0D9488', backgroundColor: '#CCFBF1' },
  { id: 9, route: 'Billing',title: 'Assembly', subtitle: 'Production', icon: 'build', color: colors.warning, backgroundColor: colors.warningLight },
  { id: 10, route: 'Billing',title: 'Journal', subtitle: 'Manual Entry', icon: 'menu-book', color: colors.gray500, backgroundColor: colors.gray100 },
];

// ─────────────────────────────────────────────────────────────────────────────

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showBranchModal, setShowBranchModal] = useState(false);

  const loadUserData = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const cachedBranch = await AsyncStorage.getItem('selectedBranch');

      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        if (parsedUser.branches?.length > 0) {
          setBranches(parsedUser.branches);
          if (cachedBranch) {
            setSelectedBranch(JSON.parse(cachedBranch));
          } else {
            setSelectedBranch(parsedUser.branches[0]);
            await AsyncStorage.setItem('selectedBranch', JSON.stringify(parsedUser.branches[0]));
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading user:', error);
      if (error.response?.status === 401) {
        await AsyncStorage.multiRemove(['authToken', 'user', 'tenant', 'selectedBranch']);
        navigation.replace('Login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => { loadUserData(); }, [loadUserData]);

  const handleQuickActionPress = (route: string) => {
    navigation.navigate(route);
  };

  const handleBranchSelect = async (branch: Branch) => {
    setSelectedBranch(branch);
    setShowBranchModal(false);
    await AsyncStorage.setItem('selectedBranch', JSON.stringify(branch));
  };

  const handleNotificationPress = () => {
    Alert.alert('Notifications', 'You have 3 new notifications', [{ text: 'OK' }]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundLight} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Icon name="person" size={24} color={colors.gray500} />
                </View>
              )}
            </View>
            <View style={styles.userTextContainer}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>{user?.name || 'User'}</Text>
                <View style={styles.divider} />
                {branches.length > 1 && (
                  <TouchableOpacity style={styles.branchSelector}
                    onPress={() => setShowBranchModal(true)} activeOpacity={0.7}>
                    <Icon name="store" size={14} color={colors.primary} />
                    <Text style={styles.branchText}>{selectedBranch?.name ?? 'Select Branch'}</Text>
                    <Icon name="expand-more" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.notificationButton}
            onPress={handleNotificationPress} activeOpacity={0.7}>
            <Icon name="notifications" size={24} color={colors.gray900} />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Sales Card ── */}
        <View style={styles.salesCard}>
          <View style={styles.salesCardBackground} />
          <View style={styles.salesCardContent}>
            <Text style={styles.salesLabel}>Total Sales Today</Text>
            <Text style={styles.salesAmount}>$1,240.50</Text>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.quickActionButton,
                action.isFeatured && styles.featuredButton,
                { width: (width - 44) / 2 },
              ]}
              onPress={() => handleQuickActionPress(action.route)}
              activeOpacity={0.9}
            >
              {action.isFeatured && (
                <View style={styles.featuredBackground}>
                  <Icon name="receipt" size={80} color={colors.shadowSm} />
                </View>
              )}
              <View style={[
                styles.actionIconContainer,
                { backgroundColor: action.isFeatured ? colors.gray900 : action.backgroundColor },
              ]}>
                <Icon name={action.icon} size={24}
                  color={action.isFeatured ? colors.white : action.color} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, action.isFeatured && styles.featuredActionTitle]}>
                  {action.title}
                </Text>
                <Text style={[styles.actionSubtitle, action.isFeatured && styles.featuredActionSubtitle]}>
                  {action.subtitle}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Branch Modal ── */}
      <Modal visible={showBranchModal} transparent animationType="fade"
        onRequestClose={() => setShowBranchModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1}
          onPress={() => setShowBranchModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Branch</Text>
              <TouchableOpacity onPress={() => setShowBranchModal(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.branchList}>
              {branches.map((branch) => (
                <TouchableOpacity key={branch.id}
                  style={[styles.branchItem, selectedBranch?.id === branch.id && styles.branchItemSelected]}
                  onPress={() => handleBranchSelect(branch)} activeOpacity={0.7}>
                  <View style={styles.branchItemContent}>
                    <Icon name="store" size={20}
                      color={selectedBranch?.id === branch.id ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.branchItemText,
                    selectedBranch?.id === branch.id && styles.branchItemTextSelected]}>
                      {branch.name}
                    </Text>
                  </View>
                  {selectedBranch?.id === branch.id && (
                    <Icon name="check-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <BottomNavigation activeRoute="Home" />
    </SafeAreaView>
  );
};

export default HomeScreen;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundLight },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.backgroundLight },
  loadingText: { marginTop: 12, fontSize: 16, color: colors.textSecondary, fontWeight: '500' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: colors.backgroundLight },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.white, shadowColor: colors.shadowMd, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { backgroundColor: colors.gray200, justifyContent: 'center', alignItems: 'center' },
  userTextContainer: { flexDirection: 'column', flex: 1 },
  welcomeText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  userName: { fontSize: 18, fontWeight: 'bold', color: colors.gray900, letterSpacing: -0.5, textTransform: 'capitalize' },
  divider: { width: 1, height: 12, backgroundColor: colors.gray300 },
  branchSelector: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.gray100, borderRadius: 6 },
  branchText: { fontSize: 12, fontWeight: '600', color: colors.gray700 },

  notificationButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, alignItems: 'center', justifyContent: 'center', shadowColor: colors.shadowSm, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, position: 'relative' },
  notificationBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: colors.danger, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.backgroundLight },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: 'bold' },

  // Sales Card
  salesCard: { marginHorizontal: 16, marginVertical: 8, backgroundColor: colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.gray200, shadowColor: colors.shadowSm, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, overflow: 'hidden' },
  salesCardBackground: { position: 'absolute', right: -24, top: -24, width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primaryMuted },
  salesCardContent: { zIndex: 1 },
  salesLabel: { fontSize: 14, fontWeight: '500', color: colors.textSecondary, marginBottom: 8 },
  salesAmount: { fontSize: 32, fontWeight: '800', color: colors.gray900, letterSpacing: -1 },

  // Quick Actions
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 12, marginTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.gray900, letterSpacing: -0.5 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  quickActionButton: { aspectRatio: 1, backgroundColor: colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.gray200, shadowColor: colors.shadowSm, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, justifyContent: 'space-between', overflow: 'hidden' },
  featuredButton: { backgroundColor: colors.featured, borderWidth: 0, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  featuredBackground: { position: 'absolute', right: -10, top: -10 },
  actionIconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  actionTextContainer: { gap: 2 },
  actionTitle: { fontSize: 16, fontWeight: '700', color: colors.gray900 },
  featuredActionTitle: { color: colors.gray900 },
  actionSubtitle: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  featuredActionSubtitle: { color: colors.darkMuted },
  bottomSpacer: { height: 32 },

  // Branch Modal
  modalOverlay: { flex: 1, backgroundColor: colors.backgroundOverlay, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContent: { backgroundColor: colors.white, borderRadius: 20, width: '100%', maxWidth: 400, shadowColor: colors.shadowLg, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.gray900 },
  branchList: { paddingVertical: 8 },
  branchItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  branchItemSelected: { backgroundColor: colors.successLight },
  branchItemContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  branchItemText: { fontSize: 16, fontWeight: '500', color: colors.gray700 },
  branchItemTextSelected: { color: colors.gray900, fontWeight: '600' },
});