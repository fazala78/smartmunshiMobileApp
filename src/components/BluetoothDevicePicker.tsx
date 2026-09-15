import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme';
import { BluetoothPrinterDevice, listPairedPrinters } from '../services/bluetoothPrinter';

interface Props {
  visible: boolean;
  onSelect: (device: BluetoothPrinterDevice) => void;
  onClose: () => void;
}

const errorMessage = (err: any): string => {
  switch (err?.code) {
    case 'BLUETOOTH_DISABLED':
      return 'Bluetooth is turned off. Turn it on and try again.';
    case 'BLUETOOTH_UNSUPPORTED':
      return 'This device does not support Bluetooth.';
    case 'PERMISSION_DENIED':
      return 'Bluetooth permission was denied.';
    default:
      return 'Could not load paired devices.';
  }
};

// Lists already-*paired* Bluetooth devices only — no in-app discovery/scanning.
// The user pairs their receipt printer once via Android's own Bluetooth
// settings; this just lets them pick which bonded device to print to.
const BluetoothDevicePicker: React.FC<Props> = ({ visible, onSelect, onClose }) => {
  const [devices, setDevices] = useState<BluetoothPrinterDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setLoading(true);
    setError(null);
    listPairedPrinters()
      .then(list => {
        if (alive) setDevices(list);
      })
      .catch(err => {
        if (alive) setError(errorMessage(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.grip} />
          <Text style={styles.sheetTitle}>Choose Bluetooth Printer</Text>

          {loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {devices.map((device, i) => (
                <React.Fragment key={device.address}>
                  {i > 0 && <View style={styles.separator} />}
                  <TouchableOpacity style={styles.listRow} onPress={() => onSelect(device)} activeOpacity={0.7}>
                    <View style={styles.listIconWrap}>
                      <Icon name="print" size={18} color={colors.gray400} />
                    </View>
                    <View style={styles.listInfo}>
                      <Text style={styles.listName}>{device.name}</Text>
                      <Text style={styles.listAddress}>{device.address}</Text>
                    </View>
                    <Icon name="chevron-right" size={18} color={colors.gray300} />
                  </TouchableOpacity>
                </React.Fragment>
              ))}

              {!error && !loading && devices.length === 0 && (
                <View style={styles.stateBox}>
                  <Icon name="bluetooth-disabled" size={30} color={colors.gray300} />
                  <Text style={styles.stateText}>
                    No paired printer found. Pair it in Android Bluetooth settings first.
                  </Text>
                </View>
              )}

              {error && (
                <View style={styles.stateBox}>
                  <Icon name="error-outline" size={30} color={colors.gray300} />
                  <Text style={styles.stateText}>{error}</Text>
                </View>
              )}

              <View style={{ height: 16 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default BluetoothDevicePicker;

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.backgroundOverlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    maxHeight: '70%',
    minHeight: 200,
  },
  grip: { width: 40, height: 5, borderRadius: 99, backgroundColor: colors.gray300, alignSelf: 'center', marginVertical: 10 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: colors.gray900, marginBottom: 14 },
  separator: { height: 1, backgroundColor: colors.gray100, marginHorizontal: 8 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10 },
  listIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInfo: { flex: 1 },
  listName: { fontSize: 14, fontWeight: '600', color: colors.gray900 },
  listAddress: { fontSize: 11, color: colors.gray400, marginTop: 1 },
  stateBox: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  stateText: { fontSize: 13, color: colors.gray400, textAlign: 'center', paddingHorizontal: 24 },
});
