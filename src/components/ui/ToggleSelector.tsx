import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ToggleOption {
  label:  string;
  value:  string | number | boolean;
  icon?:  string;   // MaterialIcons name
  color?: string;   // custom accent per option (overrides accentColor)
}

export interface ToggleSelectorProps {
  options:      ToggleOption[];
  value:        ToggleOption['value'] | null;
  onChange:     (value: ToggleOption['value'] | null) => void;
  label?:       string;
  hint?:        string;
  disabled?:    boolean;
  /** Accent color for the active option. Default: brand green */
  accentColor?: string;
  bg?:          'white' | 'gray';
  /** 'fit' — each option takes equal width | 'scroll' — scrollable when options overflow */
  sizing?:      'fit' | 'scroll';
}

// ─────────────────────────────────────────────────────────────────────────────

const ToggleSelector: React.FC<ToggleSelectorProps> = ({
  options,
  value,
  onChange,
  label,
  hint,
  disabled    = false,
  accentColor = COLORS.brand,
  bg          = 'white',
  sizing      = 'fit',
}) => {

  const handlePress = (optValue: ToggleOption['value']) => {
    if (disabled) return;
    // Tap active → deselect; tap new → select
    onChange(value === optValue ? null : optValue);
  };

  const trackBg = bg === 'gray' ? '#e5e7eb' : '#f3f4f6';

  const content = options.map((opt, idx) => {
    const active  = value === opt.value;
    const accent  = opt.color ?? accentColor;
    const isFirst = idx === 0;
    const isLast  = idx === options.length - 1;

    return (
      <TouchableOpacity
        key={String(opt.value)}
        style={[
          styles.option,
          sizing === 'fit' && styles.optionFlex,
          // Active — raised pill inside the track
          active && [styles.optionActive, { shadowColor: accent }],
          // Round only the outer ends of the group
          isFirst && styles.optionFirst,
          isLast  && styles.optionLast,
          disabled && styles.optionDisabled,
        ]}
        onPress={() => handlePress(opt.value)}
        activeOpacity={0.75}
      >
        {/* Active indicator dot */}
        {active && (
          <View style={[styles.activeDot, { backgroundColor: accent }]} />
        )}

        {opt.icon && (
          <Icon
            name={opt.icon}
            size={16}
            color={active ? accent : COLORS.gray400}
            style={active && { marginLeft: 2 }}
          />
        )}

        <Text style={[
          styles.optionText,
          active && [styles.optionTextActive, { color: accent }],
        ]}>
          {opt.label}
        </Text>
      </TouchableOpacity>
    );
  });

  return (
    <View style={styles.wrapper}>

      {/* Label */}
      {!!label && <Text style={styles.label}>{label}</Text>}

      {/* Track */}
      {sizing === 'scroll' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.track, { backgroundColor: trackBg }]}
          contentContainerStyle={styles.trackScroll}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.track, styles.trackFit, { backgroundColor: trackBg }]}>
          {content}
        </View>
      )}

      {/* Hint */}
      {!!hint && <Text style={styles.hint}>{hint}</Text>}

    </View>
  );
};

export default ToggleSelector;

// ─── Colors ───────────────────────────────────────────────────────────────────
const COLORS = {
  brand:  '#13ec5b',
  gray800:'#1f2937',
  gray600:'#4b5563',
  gray400:'#9ca3af',
  gray300:'#d1d5db',
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: { gap: 6 },

  label: {
    fontSize:   13,
    fontWeight: '700',
    color:      COLORS.gray600,
  },

  // Track — the outer container
  track: {
    borderRadius: 12,
    padding:      4,
  },
  trackFit: {
    flexDirection: 'row',
  },
  trackScroll: {
    flexDirection: 'row',
    gap:           0,
  },

  // Option — each button inside the track
  option: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            6,
    paddingVertical:   10,
    paddingHorizontal: 14,
    borderRadius:      9,
    position:          'relative',
  },
  optionFlex:     { flex: 1 },
  optionFirst:    { borderTopLeftRadius: 9, borderBottomLeftRadius: 9 },
  optionLast:     { borderTopRightRadius: 9, borderBottomRightRadius: 9 },
  optionDisabled: { opacity: 0.45 },

  // Active state — white raised pill
  optionActive: {
    backgroundColor: '#ffffff',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.12,
    shadowRadius:    4,
    elevation:       3,
  },

  // Tiny dot indicator top-left of active option
  activeDot: {
    position:     'absolute',
    top:          6,
    left:         8,
    width:        5,
    height:       5,
    borderRadius: 3,
  },

  optionText: {
    fontSize:   13,
    fontWeight: '600',
    color:      COLORS.gray400,
    textAlign:  'center',
  },
  optionTextActive: {
    fontWeight: '800',
  },

  hint: {
    fontSize: 12,
    color:    COLORS.gray400,
  },
});