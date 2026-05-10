import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, spacing } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface HeaderProps {
  title: string;
  navigation: any;
}

const Header: React.FC<HeaderProps> = ({ title, navigation }) => {
  return (
    <View style={styles.header}>
      {navigation != null && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="chevron-left" size={28} color={colors.gray900} />
        </TouchableOpacity>
      )}
      {navigation === null && (
        <Text style={styles.backBtn}></Text>
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerSpacer: { width: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 0,
    backgroundColor: colors.white,
  },
 
  headerTitle: {
    flex: 1,
    fontWeight: '700',
    fontSize: 20,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    textTransform:'capitalize',
  },
});

export default Header;