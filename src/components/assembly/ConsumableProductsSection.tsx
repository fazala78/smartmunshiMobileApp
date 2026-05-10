// ConsumableProductsSection.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme';

// Re-usable row component (can be moved to separate file too)
interface ConsumProductRowProps {
  item: {
    id: number;
    name: string;
    supplied_qty: number;
    used_qty: number;
    quantity: number | null;
    cost: number;
    unit: string;
    totalConsumed?:number ;
  };
  onValidQuantityChange: (id: number, quantity: number | null, isValid: boolean) => void;
}

const ConsumProductRow: React.FC<ConsumProductRowProps> = ({ item, onValidQuantityChange }) => {
  const available = item.supplied_qty - (item.totalConsumed || 0) - item.used_qty;
  const [inputValue, setInputValue] = useState(
    item.quantity != null && item.quantity > 0 ? String(item.quantity) : ''
  );
  const [error, setError] = useState<string | null>(null);

  // Sync when parent updates quantity (e.g., after clamp)
  useEffect(() => {
    const newValue = item.quantity != null && item.quantity > 0 ? String(item.quantity) : '';
    setInputValue(newValue);
  }, [item.quantity]);

  const validateAndNotify = (raw: string): number | null => {
    if (raw === '' || raw === '0') {
      setError(null);
      onValidQuantityChange(item.id, null, true);
      return null;
    }
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed < 0) {
      setError('Enter a valid quantity.');
      onValidQuantityChange(item.id, null, false);
      return null;
    }
    if (parsed > available) {
      setError(`Max available: ${available} ${item.unit}`);
      onValidQuantityChange(item.id, available, false);
      return available;
    }
    setError(null);
    onValidQuantityChange(item.id, parsed, true);
    return parsed;
  };

  const handleChange = (raw: string) => {
    setInputValue(raw);
    validateAndNotify(raw);
  };

  const usedPct = item.supplied_qty > 0
    ? Math.min(((item.totalConsumed || 0) / item.supplied_qty) * 100, 100)
    : 0;

  return (
    <View style={consumStyles.row}>
      <View style={consumStyles.topRow}>
        <View style={consumStyles.nameWrap}>
          <View style={consumStyles.dot} />
          <Text style={consumStyles.name} numberOfLines={1}>{item.name}</Text>
          <View style={consumStyles.unitBadge}>
            <Text style={consumStyles.unitText}>{item.unit}</Text>
          </View>
        </View>
        <Text style={consumStyles.costText}>${item.cost?.toFixed(2)}</Text>
      </View>

      <View style={consumStyles.statsRow}>
        <View style={consumStyles.statPill}>
          <Text style={consumStyles.statLabel}>Supplied</Text>
          <Text style={consumStyles.statValue}>{item.supplied_qty}</Text>
        </View>
        <View style={consumStyles.statDivider} />
        <View style={consumStyles.statPill}>
          <Text style={consumStyles.statLabel}>Used</Text>
          <Text style={[consumStyles.statValue, (item.totalConsumed || 0) > 0 && consumStyles.statUsed]}>
            {(item.totalConsumed || 0) + item.used_qty}
          </Text>
        </View>
        <View style={consumStyles.statDivider} />
        <View style={consumStyles.statPill}>
          <Text style={consumStyles.statLabel}>Available</Text>
          <Text style={[consumStyles.statValue, available > 0 ? consumStyles.statAvail : consumStyles.statZero]}>
            {available}
          </Text>
        </View>
      </View>

      <View style={consumStyles.progressTrack}>
        <View style={[consumStyles.progressFill, { width: `${usedPct}%` }]} />
      </View>

      <View style={consumStyles.inputRow}>
        <Text style={consumStyles.inputLabel}>Quantity to use</Text>
        <View style={[consumStyles.inputWrap, !!error && consumStyles.inputWrapError]}>
          <TextInput
            style={consumStyles.input}
            value={inputValue}
            onChangeText={handleChange}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#9ca3af"
          />
          <Text style={consumStyles.inputUnit}>{item.unit}</Text>
        </View>
      </View>
      {error && (
        <View style={consumStyles.errorRow}>
          <Icon name="error-outline" size={12} color="#EF4444" />
          <Text style={consumStyles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

// Main exported component
interface ConsumableProductsSectionProps {
  consumProducts: any[];
  onQuantityChange: (id: number, quantity: number | null) => void;
  onValidityChange: (isValid: boolean) => void;
}

export const ConsumableProductsSection: React.FC<ConsumableProductsSectionProps> = ({
  consumProducts,
  onQuantityChange,
  onValidityChange,
}) => {
  const [validityMap, setValidityMap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const allValid = Object.values(validityMap).every(v => v === true);
    onValidityChange(allValid);
  }, [validityMap, onValidityChange]);

  const handleValidQuantityChange = (id: number, quantity: number | null, isValid: boolean) => {
    setValidityMap(prev => ({ ...prev, [id]: isValid }));
    onQuantityChange(id, quantity);
  };

  if (!consumProducts.length) return null;

  return (
    <View style={[consumStyles.field, { marginBottom: 20 }]}>
      <View style={consumStyles.sectionHeader}>
        <View style={consumStyles.sectionIconWrap}>
          <Icon name="precision-manufacturing" size={14} color={colors.warning} />
        </View>
        <Text style={consumStyles.sectionTitle}>USED MATERIALS</Text>
        <View style={consumStyles.countBadge}>
          <Text style={consumStyles.countBadgeText}>{consumProducts.length}</Text>
        </View>
      </View>

      <View style={consumStyles.container}>
        {consumProducts.map((cp, idx) => (
          <React.Fragment key={cp.id}>
            <ConsumProductRow
              item={cp}
              onValidQuantityChange={handleValidQuantityChange}
            />
            {idx < consumProducts.length - 1 && <View style={consumStyles.rowDivider} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

// Styles (same as original consumStyles, moved here)
const consumStyles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionIconWrap: { width: 24, height: 24, borderRadius: 6, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 10, fontWeight: '800', color: '#B45309', letterSpacing: 1.2, textTransform: 'uppercase', flex: 1 },
  countBadge: { backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: '#B45309' },
  container: { backgroundColor: '#FFFBEB', borderRadius: 12, borderWidth: 1.5, borderColor: '#FDE68A', overflow: 'hidden' },
  row: { padding: 12, gap: 8 },
  rowDivider: { height: 1, backgroundColor: '#FDE68A' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F59E0B' },
  name: { fontSize: 14, fontWeight: '700', color: '#92400E', flex: 1 },
  unitBadge: { backgroundColor: '#FEF3C7', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  unitText: { fontSize: 10, fontWeight: '700', color: '#D97706' },
  costText: { fontSize: 13, fontWeight: '700', color: '#78350F' },
  statsRow: { flexDirection: 'row', backgroundColor: '#FEF9EE', borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A', overflow: 'hidden' },
  statPill: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  statDivider: { width: 1, backgroundColor: '#FDE68A' },
  statLabel: { fontSize: 9, fontWeight: '600', color: '#92400E', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: '800', color: '#78350F' },
  statUsed: { color: '#DC2626' },
  statAvail: { color: '#16A34A' },
  statZero: { color: '#9CA3AF' },
  progressTrack: { height: 4, backgroundColor: '#FDE68A', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: '#F59E0B', borderRadius: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 2 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#92400E', flex: 1 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#FDE68A', borderRadius: 8, paddingHorizontal: 10, minWidth: 110 },
  inputWrapError: { borderColor: '#EF4444' },
  input: { fontSize: 15, fontWeight: '700', color: '#78350F', paddingVertical: 8, flex: 1, textAlign: 'left' },
  inputUnit: { fontSize: 11, fontWeight: '600', color: '#D97706', marginLeft: 5 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  errorText: { fontSize: 11, color: '#EF4444', fontWeight: '500' },
  field: { gap: 8, marginTop: 20 },
});