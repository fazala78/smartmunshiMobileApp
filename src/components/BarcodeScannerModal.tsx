import React, { useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onBarcodeScanned: (barcode: string) => void;
}

export default function BarcodeScannerModal({
  visible,
  onClose,
  onBarcodeScanned,
}: BarcodeScannerModalProps) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const scanned = useRef(false);

  const codeScanner = useCodeScanner({
    codeTypes: [
      'qr', 'ean-13', 'ean-8', 'upc-a', 'upc-e',
      'code-128', 'code-39', 'code-93', 'data-matrix', 'pdf-417',
    ],
    onCodeScanned: (codes) => {
      if (scanned.current || !visible) return;
      const value = codes[0]?.value;
      if (!value) return;
      scanned.current = true;
      onBarcodeScanned(value);
    },
  });

  const handleModalShow = () => {
    scanned.current = false;
    if (!hasPermission) requestPermission();
  };

  const handleClose = () => {
    scanned.current = false;
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      onShow={handleModalShow}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan Barcode</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close" size={26} color={colors.white} />
          </TouchableOpacity>
        </View>

        {!hasPermission ? (
          <View style={styles.centerBox}>
            <Icon name="camera-alt" size={48} color={colors.gray400} />
            <Text style={styles.infoText}>Camera permission required</Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : !device ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.infoText}>Starting camera…</Text>
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={visible}
              codeScanner={codeScanner}
            />
            <View style={styles.overlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <Text style={styles.hint}>Align barcode within the frame</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const CORNER = 20;
const BORDER = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: 'rgba(0,0,0,0.7)',
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.white },
  cameraWrapper: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  scanFrame: { width: 260, height: 200, position: 'relative' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.primary },
  cornerTL: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER },
  cornerTR: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER },
  hint: {
    marginTop: 20, color: colors.white, fontSize: 13, fontWeight: '500', textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  infoText: { fontSize: 16, color: colors.white, fontWeight: '600' },
  permissionBtn: {
    marginTop: 8, backgroundColor: colors.primary, paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 8,
  },
  permissionBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
