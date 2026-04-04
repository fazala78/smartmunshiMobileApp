import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SwitchFieldProps {
  value:        boolean;
  onChange:     (value: boolean) => void;

  // Simple mode
  label?:       string;
  hint?:        string;

  // Decision / segmented mode
  labelFalse?:  string;
  labelTrue?:   string;
  iconFalse?:   string;
  iconTrue?:    string;

  disabled?:    boolean;
  colorTrue?:   string;
  colorFalse?:  string;
}

// ─────────────────────────────────────────────────────────────────────────────

const SwitchField: React.FC<SwitchFieldProps> = ({
  value,
  onChange,
  label,
  hint,
  labelFalse  = 'No',
  labelTrue   = 'Yes',
  iconFalse,
  iconTrue,
  disabled    = false,
  colorTrue   = COLORS.brand,
  colorFalse  = COLORS.red,
}) => {

  // ── Measure track so we can use real pixel values ─────────────────────────
  const [pillWidth, setPillWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isFirstRender = useRef(true);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    // Pill takes exactly half the inner track (minus padding on each side)
    const half = (w - 8) / 2;   // 8 = padding 4px * 2
    setPillWidth(half);

    // Set initial position instantly without animation
    slideAnim.setValue(value ? half : 0);
    isFirstRender.current = false;
  };

  // Animate when value changes (skip the very first mount)
  useEffect(() => {
    if (pillWidth === 0) return;
    Animated.spring(slideAnim, {
      toValue:         value ? pillWidth : 0,
      useNativeDriver: true,
      tension:         80,
      friction:        12,
    }).start();
  }, [value, pillWidth]);

  const activeColor = value ? colorTrue : colorFalse;
  const isDecision  = !!labelFalse || !!labelTrue;

  // ── Simple toggle mode ────────────────────────────────────────────────────
  if (!isDecision) {
    return (
      <TouchableOpacity
        style={[styles.simpleRow, disabled && styles.disabled]}
        onPress={() => !disabled && onChange(!value)}
        activeOpacity={0.7}
      >
        {!!label && (
          <View style={styles.simpleLabelGroup}>
            <Text style={styles.simpleLabel}>{label}</Text>
            {!!hint && <Text style={styles.hint}>{hint}</Text>}
          </View>
        )}
        <View style={[styles.simpleTrack, { backgroundColor: value ? colorTrue : COLORS.gray200 }]}>
          <View style={[styles.simpleThumb, value ? styles.thumbOn : styles.thumbOff]} />
        </View>
      </TouchableOpacity>
    );
  }

  // ── Segmented control ─────────────────────────────────────────────────────
  return (
    <View style={[styles.wrapper, disabled && styles.disabled]}>
      {!!label && <Text style={styles.topLabel}>{label}</Text>}

      <View style={styles.segment} onLayout={onTrackLayout}>

        {/* Animated sliding pill — only render once width is known */}
        {pillWidth > 0 && (
          <Animated.View
            style={[
              styles.slidingPill,
              {
                width:           pillWidth,
                backgroundColor: activeColor,
                shadowColor:     activeColor,
                transform:       [{ translateX: slideAnim }],
              },
            ]}
          />
        )}

        {/* False option */}
        <TouchableOpacity
          style={styles.segOption}
          onPress={() => !disabled && onChange(false)}
          activeOpacity={0.8}
        >
          {iconFalse && (
            <Icon name={iconFalse} size={15} color={!value ? '#fff' : COLORS.gray400} />
          )}
          <Text style={[styles.segLabel, !value ? styles.segLabelActive : styles.segLabelInactive]}>
            {labelFalse}
          </Text>
        </TouchableOpacity>

        {/* True option */}
        <TouchableOpacity
          style={styles.segOption}
          onPress={() => !disabled && onChange(true)}
          activeOpacity={0.8}
        >
          {iconTrue && (
            <Icon name={iconTrue} size={15} color={value ? '#fff' : COLORS.gray400} />
          )}
          <Text style={[styles.segLabel, value ? styles.segLabelActive : styles.segLabelInactive]}>
            {labelTrue}
          </Text>
        </TouchableOpacity>

      </View>

      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
};

export default SwitchField;

// ─── Colors ──────────────────────────────────────────────────────────────────
const COLORS = {
  brand:  '#13ec5b',
  red:    '#ef4444',
  gray800:'#1f2937',
  gray500:'#6b7280',
  gray400:'#9ca3af',
  gray200:'#e5e7eb',
  gray100:'#f3f4f6',
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  disabled: { opacity: 0.45 },
  hint:     { fontSize: 12, color: COLORS.gray500 },

  // ── Segmented ─────────────────────────────────────────────────────────────
  wrapper:  { gap: 8 },
  topLabel: { fontSize: 13, fontWeight: '700', color: COLORS.gray500 },

  segment: {
    flexDirection:   'row',
    backgroundColor: COLORS.gray100,
    borderRadius:    14,
    borderWidth:     1.5,
    borderColor:     COLORS.gray200,
    padding:         4,
    position:        'relative',
    overflow:        'hidden',
  },

  slidingPill: {
    position:      'absolute',
    top:           4,
    bottom:        4,
    left:          4,
    borderRadius:  10,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius:  6,
    elevation:     4,
  },

  segOption: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            6,
    paddingVertical:   12,
    paddingHorizontal: 8,
    zIndex:            1,
  },

  segLabel:         { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  segLabelActive:   { color: '#ffffff' },
  segLabelInactive: { color: COLORS.gray400 },

  // ── Simple ────────────────────────────────────────────────────────────────
  simpleRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  simpleLabelGroup: { flex: 1, gap: 2 },
  simpleLabel:      { fontSize: 14, fontWeight: '600', color: COLORS.gray800 },
  simpleTrack: {
    width:          50,
    height:         28,
    borderRadius:   14,
    padding:        3,
    justifyContent: 'center',
  },
  simpleThumb: {
    width:           22,
    height:          22,
    borderRadius:    11,
    backgroundColor: '#ffffff',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.15,
    shadowRadius:    2,
    elevation:       2,
  },
  thumbOff: { alignSelf: 'flex-start' },
  thumbOn:  { alignSelf: 'flex-end' },
});