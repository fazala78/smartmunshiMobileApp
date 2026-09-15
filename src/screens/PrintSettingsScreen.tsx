import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme';
import Header from '../components/ui/Header';
import {
  PaperSize,
  ReceiptType,
  PAPER_SIZE_OPTIONS,
  RECEIPT_TYPE_LABELS,
  getAllPrintPaperSizes,
  setPrintPaperSize,
} from '../services/printSettings';
import {
  BluetoothPrinterDevice,
  getSelectedPrinter,
  setSelectedPrinter,
  clearSelectedPrinter,
} from '../services/bluetoothPrinter';
import BluetoothDevicePicker from '../components/BluetoothDevicePicker';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PrintSettings'>;
};

const RECEIPT_TYPES: ReceiptType[] = ['receivePayment', 'paidPayment', 'invoice', 'purchase'];

const PrintSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const [paperSizes, setPaperSizes] = useState<Record<ReceiptType, PaperSize>>(getAllPrintPaperSizes());
  const [printer, setPrinter] = useState<BluetoothPrinterDevice | null>(getSelectedPrinter());
  const [pickerVisible, setPickerVisible] = useState(false);

  const handleSelect = (type: ReceiptType, size: PaperSize) => {
    setPrintPaperSize(type, size);
    setPaperSizes(prev => ({ ...prev, [type]: size }));
  };

  const handleDeviceSelected = (device: BluetoothPrinterDevice) => {
    setSelectedPrinter(device);
    setPrinter(device);
    setPickerVisible(false);
  };

  const handleForgetPrinter = () => {
    clearSelectedPrinter();
    setPrinter(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <Header title="Print Settings" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bluetooth Printer</Text>
          <Text style={styles.hint}>Used when you tap Print on a receipt (Android only).</Text>
          <View style={styles.printerRow}>
            <View style={styles.printerInfo}>
              <Icon name="print" size={18} color={colors.gray400} />
              <Text style={styles.printerName} numberOfLines={1}>
                {printer ? printer.name : 'No printer selected'}
              </Text>
            </View>
            <View style={styles.printerActions}>
              <TouchableOpacity
                style={styles.printerButton}
                onPress={() => setPickerVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.printerButtonText}>{printer ? 'Change' : 'Select'}</Text>
              </TouchableOpacity>
              {printer && (
                <TouchableOpacity style={styles.printerButton} onPress={handleForgetPrinter} activeOpacity={0.8}>
                  <Text style={styles.printerButtonText}>Forget</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.hint}>Choose the paper size used when printing each receipt type.</Text>

        {RECEIPT_TYPES.map(type => (
          <View key={type} style={styles.section}>
            <Text style={styles.sectionTitle}>{RECEIPT_TYPE_LABELS[type]}</Text>
            <View style={styles.chipRow}>
              {PAPER_SIZE_OPTIONS.map(option => {
                const selected = paperSizes[type] === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => handleSelect(type, option.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <View style={{ height: 28 }} />
      </ScrollView>

      <BluetoothDevicePicker
        visible={pickerVisible}
        onSelect={handleDeviceSelected}
        onClose={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
};

export default PrintSettingsScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundLight },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  hint: { fontSize: 13, color: colors.textSecondary, marginBottom: 20, lineHeight: 19 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.gray700 },
  chipTextSelected: { color: colors.white },

  printerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  printerInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  printerName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, flexShrink: 1 },
  printerActions: { flexDirection: 'row', gap: 8 },
  printerButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.backgroundLight,
  },
  printerButtonText: { fontSize: 12, fontWeight: '700', color: colors.gray700 },
});
