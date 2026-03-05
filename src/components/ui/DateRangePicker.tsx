import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { DatePickerModal, registerTranslation, en } from 'react-native-paper-dates';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme';
// Register the English locale (Essential for the modal to display correctly)
registerTranslation('en', en);

// Custom theme with your green color
const customTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary, // Your green color
    primaryContainer: colors.primaryLight, // Light green background
    onPrimaryContainer: colors.backgroundDark, // Text on selected dates
    secondary: colors.primary,
    onSecondary: colors.white,
    surface: colors.white,
    onSurface: colors.backgroundDark,
    surfaceVariant: colors.backgroundLight,
    onSurfaceVariant: colors.textPlaceholder,
  },
};

interface DateRangePickerProps {
  label?: string;
  startDate?: Date;
  endDate?: Date;
  onDateChange?: (startDate: Date | undefined, endDate: Date | undefined) => void;
  placeholder?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  label = 'DATE RANGE',
  startDate,
  endDate,
  onDateChange,
  placeholder = 'Select date range',
}) => {
  const [visible, setVisible] = useState(false);
  const [range, setRange] = useState<{
    startDate: Date | undefined;
    endDate: Date | undefined;
  }>({
    startDate: startDate,
    endDate: endDate,
  });

  const onDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  const onConfirm = useCallback(
    ({ startDate, endDate }: { startDate: Date | undefined; endDate: Date | undefined }) => {
      setVisible(false);
      setRange({ startDate, endDate });
      onDateChange?.(startDate, endDate);
    },
    [onDateChange]
  );

  // Helper to format the display label
  const getRangeLabel = () => {
    if (!range.startDate) return placeholder;
    const start = range.startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const end = range.endDate
      ? range.endDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '...';
    return `${start} - ${end}`;
  };

  const hasValue = range.startDate !== undefined;

  return (
    <>
     <Text style={styles.label}>{label}</Text>
     <PaperProvider theme={customTheme}>
      <View style={styles.container}>
        {/* Label */}
        <Text style={styles.label}>{label}</Text>

        {/* Date Range Display */}
        <TouchableOpacity
          style={[styles.input, hasValue && styles.inputFilled]}
          onPress={() => setVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.inputContent}>
            <Icon
              name="calendar-today"
              size={20}
              color={hasValue ? colors.primary : '#61896f'}
              style={styles.icon}
            />
            <Text
              style={[
                styles.inputText,
                hasValue && styles.inputTextFilled,
              ]}
            >
              {getRangeLabel()}
            </Text>
          </View>

          {hasValue && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                setRange({ startDate: undefined, endDate: undefined });
                onDateChange?.(undefined, undefined);
              }}
              style={styles.clearButton}
            >
              <Icon name="close" size={20} color="#61896f" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Date Picker Modal */}
        <DatePickerModal
          locale="en"
          mode="range"
          visible={visible}
          onDismiss={onDismiss}
          startDate={range.startDate}
          endDate={range.endDate}
          onConfirm={onConfirm}
          saveLabel="Apply"
          label="Select Date Range"
        />
      </View>
    </PaperProvider>
    </>
    
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  input: {
    height: 48,
    backgroundColor: '#f6f8f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputFilled: {
    backgroundColor: 'rgba(19, 236, 91, 0.05)',
    borderColor: '#13ec5b',
  },
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  inputText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a0c4ac',
    flex: 1,
  },
  inputTextFilled: {
    color: '#111813',
    fontWeight: '600',
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(97, 137, 111, 0.1)',
    marginLeft: 8,
  },
});

export default DateRangePicker;