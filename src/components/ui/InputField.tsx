import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, typography } from '../../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldType = 'text' | 'number' | 'decimal' | 'email' | 'phone' | 'password';

export interface InputFieldProps {
  value:             string | number | null | undefined;
  onChangeText:      (value: string) => void;

  /** 'gray' — component sits on gray bg  → input surface is white
   *  'white' — component sits on white bg → input surface is light gray
   *  Default: 'white' */
  bg?:               'gray' | 'white';
  type?:             FieldType;
  label?:            string;
  placeholder?:      string;
  icon?:             string;
  iconRight?:        string;
  onIconRightPress?: () => void;

  disabled?:         boolean;
  error?:            string;
  hint?:             string;

  multiline?:        boolean;
  numberOfLines?:    number;
  maxLength?:        number;
  autoCapitalize?:   'none' | 'sentences' | 'words' | 'characters';
  returnKeyType?:    'done' | 'next' | 'search' | 'go' | 'send';
  onSubmitEditing?:  () => void;
  onFocus?:          () => void;
  onBlur?:           () => void;
  textAlign?:        'left' | 'center' | 'right';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const KEYBOARD_MAP: Record<FieldType, KeyboardTypeOptions> = {
  text:     'default',
  number:   'numeric',
  decimal:  'decimal-pad',
  email:    'email-address',
  phone:    'phone-pad',
  password: 'default',
};

/** Characters allowed in a decimal field — digits, one dot, optional leading minus */
const DECIMAL_REGEX = /^-?\d*\.?\d*$/;

// ─── Component ────────────────────────────────────────────────────────────────

const InputField: React.FC<InputFieldProps> = ({
  value,
  onChangeText,
  bg             = 'white',
  type           = 'text',
  label,
  placeholder,
  icon,
  iconRight,
  onIconRightPress,
  disabled       = false,
  error,
  hint,
  multiline      = false,
  numberOfLines  = 1,
  maxLength,
  autoCapitalize,
  returnKeyType  = 'done',
  textAlign      = 'left',
  onSubmitEditing,
  onFocus,
  onBlur,
}) => {
  const [focused,       setFocused]       = useState(false);
  const [secureVisible, setSecureVisible] = useState(false);

  // ── Decimal buffer ────────────────────────────────────────────────────────
  //
  // Problem: callers store the parsed float in state, e.g. payload.discount = 12.
  // When they pass value={String(12)} the trailing dot is already gone, so typing
  // "12." → parseFloat → 12 → String(12) → "12" on next render: dot never appears.
  //
  // Fix: for decimal fields we keep a local raw string (rawDecimal) that the
  // TextInput actually displays. We only sync it from the parent when the
  // *numeric* value changes — so the buffer survives in-progress typing ("12.").
  //
  const isDecimal    = type === 'decimal';
  const inputRef     = useRef<TextInput>(null);
  const [rawDecimal, setRawDecimal] = useState<string>(
    value != null && value !== '' ? String(value) : ''
  );

  // Sync buffer when parent pushes a genuinely different numeric value
  // (e.g. "Mark as paid" auto-fills the amount from outside).
  // We compare parsed floats so that "12." and "12" are treated as equal
  // and we don't clobber the buffer while the user is still typing.
  useEffect(() => {
    if (!isDecimal) return;
    const incoming = value != null && value !== '' ? String(value) : '';
    const incomingNum = parseFloat(incoming);
    const bufferNum   = parseFloat(rawDecimal);

    // Only overwrite the buffer when the numeric value genuinely changed
    // from outside (NaN === NaN is false, so empty → empty is handled too).
    const numericallySame =
      (!isNaN(incomingNum) && !isNaN(bufferNum) && incomingNum === bufferNum) ||
      (isNaN(incomingNum) && isNaN(bufferNum));

    if (!numericallySame) {
      setRawDecimal(incoming);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived display value (non-decimal types) ─────────────────────────────
  const displayValue = value != null ? String(value) : '';

  // ── Theming ───────────────────────────────────────────────────────────────
  const inputBg     = bg === 'gray' ? colors.white : colors.backgroundLight;
  const borderColor = error ? colors.danger : focused ? colors.borderFocus : colors.gray200;

  // ── Handlers ─────────────────────────────────────────────────────────────

  /** Tap anywhere on the row → focus the hidden TextInput */
  const handleRowPress = () => {
    if (disabled) return;
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleDecimalChange = (text: string) => {
    // Reject characters that can never form a valid decimal number
    if (!DECIMAL_REGEX.test(text)) return;

    setRawDecimal(text); // always update display immediately

    // Only call parent when the text represents a complete, valid number.
    // "12." is still in-progress — we pass it up as-is so the parent can
    // use parseFloat() safely; trailing dot parses to 12 on their side.
    onChangeText(text);
  };

  const handleChange = (text: string) => {
    if (isDecimal) {
      handleDecimalChange(text);
    } else {
      onChangeText(text);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.wrapper}>

      {/* Label */}
      {!!label && (
        <TouchableOpacity onPress={handleRowPress} activeOpacity={1}>
          <Text style={[styles.label, disabled && styles.labelDisabled]}>
            {label}
          </Text>
        </TouchableOpacity>
      )}

      {/* Input row — entire row is tappable to focus */}
      <TouchableOpacity
        style={[
          styles.inputBox,
          { backgroundColor: inputBg, borderColor, borderWidth: 1.5 },
          !!error   && styles.inputBoxError,
          disabled  && styles.inputBoxDisabled,
          multiline && { alignItems: 'flex-start', paddingVertical: 10 },
        ]}
        onPress={handleRowPress}
        activeOpacity={0.9}
        accessible={false}
      >
        {/* Left icon */}
        {!!icon && (
          <Icon
            name={icon}
            size={18}
            color={focused ? colors.borderFocus : colors.gray400}
            style={styles.iconLeft}
          />
        )}

        {/* Text input */}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            type === 'number' && styles.inputNumber,
            multiline && { minHeight: numberOfLines * 22, textAlignVertical: 'top' },
            disabled  && styles.inputDisabled,
            { textAlign },
          ]}
          // Decimal fields use the buffer; everything else uses the prop directly.
          value={isDecimal ? rawDecimal : displayValue}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          keyboardType={KEYBOARD_MAP[type]}
          secureTextEntry={type === 'password' && !secureVisible}
          autoCapitalize={
            autoCapitalize ??
            (type === 'email' ? 'none' : isDecimal || type === 'number' ? 'none' : 'sentences')
          }
          autoCorrect={type === 'text'}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          editable={!disabled}
          onFocus={() => { setFocused(true);  onFocus?.(); }}
          onBlur={()  => { setFocused(false); onBlur?.();  }}
        />

        {/* Password toggle */}
        {type === 'password' && (
          <TouchableOpacity
            onPress={() => setSecureVisible((v) => !v)}
            style={styles.iconRight}
            activeOpacity={1}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon
              name={secureVisible ? 'visibility' : 'visibility-off'}
              size={18}
              color={colors.gray400}
            />
          </TouchableOpacity>
        )}

        {/* Custom right icon */}
        {type !== 'password' && !!iconRight && (
          <TouchableOpacity
            onPress={onIconRightPress}
            style={styles.iconRight}
            activeOpacity={1}
            disabled={!onIconRightPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name={iconRight} size={18} color={colors.gray400} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Error */}
      {!!error && (
        <View style={styles.errorRow}>
          <Icon name="error-outline" size={13} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Hint (only when no error) */}
      {!error && !!hint && (
        <Text style={styles.hint}>{hint}</Text>
      )}

    </View>
  );
};

export default InputField;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { gap: 6 , flex:1},

  label: {
    fontSize:      10,
    fontWeight:    '800',
    color:         colors.textPlaceholder,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  labelDisabled: { opacity: 0.5 },

  inputBox: {
    flexDirection:     'row',
    alignItems:        'center',
    borderRadius:      10,
    paddingHorizontal: 12,
    minHeight:         48,
    gap:               8,
  },
  inputBoxError:    { borderColor: colors.danger, backgroundColor: colors.errorBg },
  inputBoxDisabled: { opacity: 0.5 },

  input: {
    flex:            1,
    fontSize:        typography.body.fontSize,
    fontWeight:      '500',
    color:           colors.gray900,
    paddingVertical: 0,
  },
  inputNumber:   { textAlign: 'right' },
  inputDisabled: { color: colors.gray500 },

  iconLeft:  {},
  iconRight: { paddingLeft: 4 },

  errorRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  errorText: { fontSize: 12, color: colors.danger, fontWeight: '500' },

  hint: { fontSize: 12, color: colors.gray400 },
});