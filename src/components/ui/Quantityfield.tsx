// ─── Quantity input with decimal buffer ───────────────────────────────────────
//
// Problem: value={String(pendingProduct.quantity ?? 1)} re-derives from the
// parsed number on every render, so typing "1." → parseFloat → 1 → "1" strips
// the dot immediately.
//
// Fix: a local rawQty string drives the TextInput. The parent state only
// updates when the text represents a complete valid number. The buffer is
// re-synced from the parent only when the numeric value changes from outside
// (e.g. increment / decrement buttons).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme';

interface QuantityFieldProps {
  value: number;
  onChange: (qty: number) => void;
  min?: number;
  step?: number;
}

const QuantityField: React.FC<QuantityFieldProps> = ({
  value,
  onChange,
  min  = 1,
  step = 1,
}) => {
  // ── Local string buffer ──────────────────────────────────────────────────
  const [raw, setRaw] = useState(String(value ?? min));

  // Sync buffer when the numeric value changes from outside
  // (increment / decrement buttons, or parent resets the field).
  // Compare as numbers so "1." and 1 are treated as the same — the buffer
  // is left alone while the user is still typing a decimal.
  useEffect(() => {
    const bufferNum = parseFloat(raw);
    if (isNaN(bufferNum) || bufferNum !== value) {
      setRaw(String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleChange = (text: string) => {
    // Only allow digits and a single decimal point — block letters, symbols etc.
    if (!/^\d*\.?\d*$/.test(text)) return;

    setRaw(text); // always update display immediately

    const parsed = parseFloat(text);
    if (!isNaN(parsed) && parsed >= min) {
      onChange(parsed);          // valid complete number → update parent
    } else if (text === '') {
      onChange(min);             // empty field → fall back to minimum
    }
    // "1." is still in-progress — buffer holds it, parent keeps previous value
  };

  const handleBlur = () => {
    // When the user leaves the field, resolve any in-progress decimal
    // e.g. "1." → 1, "" → min
    const parsed = parseFloat(raw);
    const resolved = isNaN(parsed) ? min : Math.max(min, parsed);
    setRaw(String(resolved));
    onChange(resolved);
  };

  const decrement = () => onChange(Math.max(min, (parseFloat(raw) || min) - step));
  const increment = () => onChange((parseFloat(raw) || min) + step);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Quantity</Text>
      <View style={styles.quantityRow}>
        <TouchableOpacity style={styles.qtyBtnLeft} onPress={decrement} activeOpacity={0.8}>
          <Icon name="remove" size={20} color={colors.white} />
        </TouchableOpacity>

        <TextInput
          style={styles.qtyInput}
          value={raw}                     // buffer drives the input, not the parsed number
          onChangeText={handleChange}
          onBlur={handleBlur}             // clean up trailing dot on focus-out
          keyboardType="decimal-pad"
          textAlign="center"
          selectTextOnFocus               // tap selects all → easy to retype
          returnKeyType="done"
        />

        <TouchableOpacity style={styles.qtyBtnRight} onPress={increment} activeOpacity={0.8}>
          <Icon name="add" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default QuantityField;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize:      10,
    fontWeight:    '800',
    color:         colors.textPlaceholder,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  quantityRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            0,
  },
  qtyBtnLeft: {
    width:           40,
    height:          45,
    borderTopLeftRadius:    10,
    borderBottomLeftRadius: 10,
    backgroundColor: colors.warning2,
    justifyContent:  'center',
    alignItems:      'center',
  },
   qtyBtnRight: {
    width:           40,
    height:          45,
        borderTopRightRadius:    10,
    borderBottomRightRadius: 10,

    backgroundColor: colors.warning2,
    justifyContent:  'center',
    alignItems:      'center',
  },
  qtyInput: {
    flex:            1,
    height:          45,
    backgroundColor: colors.backgroundLight,
    borderWidth:     1.5,
    borderColor:     colors.gray200,
    fontSize:        16,
    fontWeight:      '700',
    color:           colors.gray900,
    textAlign:       'center',
    paddingVertical: 0,
  },
});