// src/components/BottomNavigation.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme';

interface BottomNavItem {
  id: number;
  label: string;
  icon: string;
  screen?: keyof RootStackParamList;
  isScanner?: boolean;
  isLogout?: boolean;
}

interface BottomNavigationProps {
  activeRoute: string;
}

const navItems: BottomNavItem[] = [
  { id: 1, label: 'Home', icon: 'home', screen: 'Home' },
  { id: 2, label: 'Ledgers', icon: 'contacts', screen: 'Contacts' },
  { id: 3, label: 'Scan', icon: 'qr-code-scanner', isScanner: true },
  { id: 4, label: 'Cash Report', icon: 'payments', screen:'dailyCashReport'},
  { id: 5, label: 'Menu', icon: 'menu', screen:'Menu' },
];

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeRoute }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
 

  const handleNavPress = (item: BottomNavItem) => {
   
    if (item.screen) {
      // Check if screen exists in navigation, if not show alert
      try {

        navigation.replace(item.screen as any);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        Alert.alert(
          'Coming Soon',
          `${item.label} screen is under development`,
          [{ text: 'OK' }]
        );
      }
    } else {
      Alert.alert(
        'Coming Soon',
        `${item.label} feature is under development`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.bottomNavigation}>
      {navItems.map((item) => {
        const isActive = activeRoute === item.label || activeRoute === item.screen;

        return (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => handleNavPress(item)}
            activeOpacity={0.7}
          >
            {item.isScanner ? (
              <View style={styles.scannerButton}>
                <Icon name="qr-code-scanner" size={28} color={colors.primary} />
              </View>
            ) : (
              <>
                <Icon
                  name={item.icon}
                  size={24}
                  color={isActive ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.navLabel,
                    isActive && styles.activeNavLabel,
                  ]}
                >
                  {item.label}
                </Text>
              </>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.backgroundLight,
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 60,
  },
  scannerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#111813',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 4,
  },
  activeNavLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default BottomNavigation;