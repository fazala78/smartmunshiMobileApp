import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme';

export interface QuantityMeta {
  quantity: number;
  size: number;
}

interface PacketDetailInputProps {
  hasBagsActive: boolean;
  openingBags: any;
  onParsed: (fields: { quantity: number; bags?: number; quantity_meta: QuantityMeta[] }) => void;
}

const PacketDetailInput: React.FC<PacketDetailInputProps> = ({
  hasBagsActive,
  openingBags,
  onParsed,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');

  const parse = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    // Split by comma; each token is either "N*M" or a plain number
    const tokens = trimmed.split(',').map(s => s.trim()).filter(Boolean);

    let totalQuantity = 0;
    let totalBags = 0;
    const quantityMeta: QuantityMeta[] = [];
    let valid = true;

    for (const token of tokens) {
      if (/^\d+\*\d+$/.test(token)) {
        const [b, p] = token.split('*').map(Number);
        totalBags += b;
        totalQuantity += b * p;
        quantityMeta.push({ quantity: b, size: p });
      } else if (/^\d+(\.\d+)?$/.test(token)) {
        totalBags += 1;
        totalQuantity += Number(token);
        quantityMeta.push({ quantity: 1, size: Number(token) });
      } else {
        valid = false;
        break;
      }
    }

    if (!valid || tokens.length === 0) return;

    const fields: { quantity: number; bags?: number; quantity_meta: QuantityMeta[] } = {
      quantity: totalQuantity,
      quantity_meta: quantityMeta,
    };
    fields.bags = (hasBagsActive && openingBags != null) ? totalBags : 0;
    onParsed(fields);
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.toggleBtn} onPress={() => setExpanded(o => !o)}>
        <Icon name="inventory" size={14} color={expanded ? colors.primary : colors.gray600} />
        <Text style={[styles.toggleText, expanded && styles.toggleTextActive]}>Packet Detail</Text>
        <Icon
          name={expanded ? 'expand-less' : 'expand-more'}
          size={16}
          color={expanded ? colors.primary : colors.gray600}
        />
      </TouchableOpacity>

      <View style={!expanded && styles.hidden}>
        <TextInput
          style={styles.textArea}
          value={text}
          onChangeText={v => { setText(v); parse(v); }}
          placeholder="e.g. 21*20,200,10,40,400*50"
          placeholderTextColor={colors.gray400}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
    </View>
  );
};

export default PacketDetailInput;

const styles = StyleSheet.create({
  wrapper: { marginTop: 10 },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.backgroundLight,
  },
  hidden: { height: 0, overflow: 'hidden' },
  toggleText: { fontSize: 12, fontWeight: '700', color: colors.gray600 },
  toggleTextActive: { color: colors.primary },
  textArea: {
    marginTop: 8,
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    padding: 12,
    fontSize: 14,
    color: colors.gray900,
    minHeight: 80,
  },
});
