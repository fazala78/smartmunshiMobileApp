import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DatePickerProps {
  value?:          Date | null;
  onChange:        (date: Date | null) => void;
  placeholder?:    string;
  label?:          string;
  minDate?:        Date;
  maxDate?:        Date;
  disabled?:       boolean;
  inputBg?:        string;
  /** 'single' — pick one date (default) | 'range' — pick start + end */
  mode?:           'single' | 'range';
  onRangeChange?:  (start: Date, end: Date) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toCalendarString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDisplay = (date: Date): string =>
  date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

const parseDay = (dateString: string): Date =>
  new Date(dateString + 'T00:00:00');

// ─────────────────────────────────────────────────────────────────────────────

const DatePickerField: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  label,
  minDate,
  maxDate,
  disabled = false,
  inputBg = '#f3f4f6',
  mode = 'single',
  onRangeChange,
}) => {
  const [open, setOpen]             = useState(false);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd]     = useState<string | null>(null);

  // ── Marked dates ──────────────────────────────────────────────────────────

  const getMarkedDates = () => {
    if (mode === 'range') {
      if (!rangeStart) return {};
      const marked: Record<string, any> = {};

      if (rangeStart && !rangeEnd) {
        marked[rangeStart] = { startingDay: true, endingDay: true, color: colors.primary, textColor: colors.white };
      } else if (rangeStart && rangeEnd) {
        const start = new Date(rangeStart);
        const end   = new Date(rangeEnd);
        const cur   = new Date(start);
        while (cur <= end) {
          const key     = toCalendarString(cur);
          const isStart = key === rangeStart;
          const isEnd   = key === rangeEnd;
          marked[key] = {
            color:       isStart || isEnd ? colors.primary : colors.primaryLight,
            textColor:   isStart || isEnd ? colors.white : colors.primaryDark,
            startingDay: isStart,
            endingDay:   isEnd,
          };
          cur.setDate(cur.getDate() + 1);
        }
      }
      return marked;
    }

    if (!value) return {};
    return {
      [toCalendarString(value)]: {
        selected: true, selectedColor: colors.primary, selectedTextColor: colors.white,
      },
    };
  };

  // ── Day press ─────────────────────────────────────────────────────────────

  const handleDayPress = (day: DateData) => {
    if (mode === 'single') {
      onChange(parseDay(day.dateString));
      setOpen(false);
      return;
    }

    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(day.dateString);
      setRangeEnd(null);
    } else {
      const start = parseDay(rangeStart);
      const end   = parseDay(day.dateString);
      if (end < start) {
        setRangeStart(day.dateString);
        setRangeEnd(rangeStart);
        onRangeChange?.(end, start);
      } else {
        setRangeEnd(day.dateString);
        onRangeChange?.(start, end);
      }
    }
  };

  // ── Display ───────────────────────────────────────────────────────────────

  const displayText = () => {
    if (mode === 'range') {
      if (rangeStart && rangeEnd)
        return `${formatDisplay(parseDay(rangeStart))}  →  ${formatDisplay(parseDay(rangeEnd))}`;
      if (rangeStart)
        return `${formatDisplay(parseDay(rangeStart))}  →  ...`;
      return placeholder;
    }
    return value ? formatDisplay(value) : placeholder;
  };

  const hasValue = mode === 'range' ? !!rangeStart : !!value;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.wrapper}>

      {/* Label */}
      {!!label && <Text style={styles.label}>{label}</Text>}

      {/* Trigger */}
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: inputBg }, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.7}
      >
        <Icon name="calendar-today" size={18} color={hasValue ? colors.primary : colors.gray400} />
        <Text style={[styles.triggerText, !hasValue && styles.placeholder]} numberOfLines={1}>
          {displayText()}
        </Text>
        {hasValue && mode === 'single' ? (
          <TouchableOpacity
            onPress={() => onChange(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="close" size={16} color={colors.gray400} />
          </TouchableOpacity>
        ) : (
          <Icon name="keyboard-arrow-down" size={20} color={colors.gray400} />
        )}
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        {/* Backdrop */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />

        {/* Sheet */}
        <View style={styles.sheet}>

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>
                {mode === 'range' ? 'Select Date Range' : 'Select Date'}
              </Text>
              {mode === 'range' && (
                <Text style={styles.sheetHint}>
                  {!rangeStart
                    ? 'Tap to set start date'
                    : !rangeEnd
                    ? 'Tap to set end date'
                    : `${rangeStart}  →  ${rangeEnd}`}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.sheetClose}>
              <Icon name="close" size={20} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          {/* Calendar */}
          <Calendar
            current={value ? toCalendarString(value) : undefined}
            minDate={minDate ? toCalendarString(minDate) : undefined}
            maxDate={maxDate ? toCalendarString(maxDate) : undefined}
            onDayPress={handleDayPress}
         //  markingType={mode === 'range' ? 'period' : 'simple'}
            markedDates={getMarkedDates()}
            enableSwipeMonths
            theme={{
              backgroundColor:            colors.white,
              calendarBackground:         colors.white,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor:       colors.white,
              todayTextColor:             colors.primary,
              dayTextColor:               colors.gray800,
              textDisabledColor:          colors.gray300,
              dotColor:                   colors.primary,
              monthTextColor:             colors.gray900,
              textMonthFontWeight:        '800' as any,
              textMonthFontSize:          16,
              textDayFontSize:            14,
              textDayFontWeight:          '500' as any,
              textDayHeaderFontWeight:    '700' as any,
              textDayHeaderFontSize:      12,
              arrowColor:                 colors.primary,
            }}
          />

          {/* Range confirm */}
          {mode === 'range' && rangeStart && rangeEnd && (
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => setOpen(false)}
                activeOpacity={0.85}
              >
                <Icon name="check" size={18} color="#fff" />
                <Text style={styles.confirmBtnText}>Confirm Range</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </Modal>
    </View>
  );
};

export default DatePickerField;

// ─── Colors ───────────────────────────────────────────────────────────────────


// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: { gap: 6 },

  label: { fontSize: 10, fontWeight: '800', color: colors.textPlaceholder, letterSpacing: 1.2, textTransform: 'uppercase' },

  trigger: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               10,
    borderRadius:      12,
    paddingHorizontal: 12,
    paddingVertical:   13,
    borderWidth:       1.5,
    borderColor:       colors.gray200,
  },
  triggerDisabled: { opacity: 0.5 },
  triggerText:     { flex: 1, fontSize: 14, fontWeight: '500', color: colors.gray800 },
  placeholder:     { color: colors.gray400 },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },

  sheet: {
    position:             'absolute',
    bottom:               0,
    left:                 0,
    right:                0,
    backgroundColor:      colors.white,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    paddingBottom:        32,
    shadowColor:          '#000',
    shadowOffset:         { width: 0, height: -4 },
    shadowOpacity:        0.1,
    shadowRadius:         12,
    elevation:            16,
  },

  sheetHeader: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: 20,
    paddingTop:        20,
    paddingBottom:     14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.gray900 },
  sheetHint:  { fontSize: 12, color: colors.gray500, marginTop: 3 },
  sheetClose: {
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: colors.gray200,
    justifyContent:  'center',
    alignItems:      'center',
  },

  sheetFooter: { paddingHorizontal: 20, paddingTop: 12 },
  confirmBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    backgroundColor: colors.primary,
    borderRadius:    40,
    paddingVertical: 14,
    shadowColor:     colors.primary,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.35,
    shadowRadius:    10,
    elevation:       6,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '800', color: colors.white },
});