import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  BluetoothPrinterDevice,
  NoPrinterSelectedError,
  printToBluetoothPrinter,
  setSelectedPrinter,
} from '../services/bluetoothPrinter';
import { ReceiptType } from '../services/printSettings';

interface PendingPrint {
  htmlData: string;
  fileName: string;
  documentType?: ReceiptType;
}

// Shared by every receipt modal's "Print" action: try printing to the saved
// Bluetooth printer, and if none is saved yet, surface the device picker and
// retry the same print once the user picks one — so the picker only ever
// interrupts the flow the first time. Also tracks isPrinting so the print
// icon can show a loading state while connecting/writing to the printer.
export const useBluetoothReceiptPrint = () => {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const pendingPrint = useRef<PendingPrint | null>(null);

  const print = useCallback(async (htmlData: string, fileName: string, documentType?: ReceiptType) => {
    setIsPrinting(true);
    try {
      await printToBluetoothPrinter(htmlData, fileName, documentType);
    } catch (err) {
      if (err instanceof NoPrinterSelectedError) {
        pendingPrint.current = { htmlData, fileName, documentType };
        setPickerVisible(true);
        return;
      }
      Alert.alert('Print failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsPrinting(false);
    }
  }, []);

  const handleDeviceSelected = useCallback(async (device: BluetoothPrinterDevice) => {
    setSelectedPrinter(device);
    setPickerVisible(false);
    const pending = pendingPrint.current;
    pendingPrint.current = null;
    if (!pending) return;

    setIsPrinting(true);
    try {
      await printToBluetoothPrinter(pending.htmlData, pending.fileName, pending.documentType);
    } catch (err) {
      Alert.alert('Print failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsPrinting(false);
    }
  }, []);

  const closePicker = useCallback(() => {
    pendingPrint.current = null;
    setPickerVisible(false);
  }, []);

  return { pickerVisible, isPrinting, print, handleDeviceSelected, closePicker };
};
