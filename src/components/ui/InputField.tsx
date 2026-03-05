import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardTypeOptions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldType = 'text' | 'number' | 'decimal' | 'email' | 'phone' | 'password';

export interface InputFieldProps {
  // Value
  value:            string | number | null | undefined;
  onChangeText:     (value: string) => void;

  // Appearance
  /** 'gray' — renders on a gray background (white input, no border)
   *  'white' — renders on a white background (gray input, no border)
   *  Default: 'white' */
  bg?:              'gray' | 'white';
  type?:            FieldType;
  label?:           string;
  placeholder?:     string;
  icon?:            string;               // MaterialIcons name
  iconRight?:       string;
  onIconRightPress?: () => void;

  // State
  disabled?:        boolean;
  error?:           string;
  hint?:            string;

  // Input behaviour
  multiline?:       boolean;
  numberOfLines?:   number;
  maxLength?:       number;
  autoCapitalize?:  'none' | 'sentences' | 'words' | 'characters';
  returnKeyType?:   'done' | 'next' | 'search' | 'go' | 'send';
  onSubmitEditing?: () => void;
  onFocus?:         () => void;
  onBlur?:          () => void;
  textAlign?: 'left' | 'center' | 'right';
}

// ─── Keyboard type map ────────────────────────────────────────────────────────

const KEYBOARD_MAP: Record<FieldType, KeyboardTypeOptions> = {
  text:     'default',
  number:   'numeric',
  decimal:  'decimal-pad',
  email:    'email-address',
  phone:    'phone-pad',
  password: 'default',
};

// ─────────────────────────────────────────────────────────────────────────────

const InputField: React.FC<InputFieldProps> = ({
  value,
  onChangeText,
  bg            = 'white',
  type          = 'text',
  label,
  placeholder,
  icon,
  iconRight,
  onIconRightPress,
  disabled      = false,
  error,
  hint,
  multiline     = false,
  numberOfLines = 1,
  maxLength,
  autoCapitalize,
  returnKeyType = 'done',
  textAlign = 'left',
  onSubmitEditing,
  onFocus,
  onBlur,
}) => {
  const [focused,         setFocused]         = useState(false);
  const [secureVisible,   setSecureVisible]   = useState(false);

  const isPassword  = type === 'password';
  const isNumber    = type === 'number' || type === 'decimal';
  const displayValue = value != null ? String(value) : '';

  // ── Theming — gray parent → white input | white parent → gray input ────────
  const inputBg      = bg === 'gray' ? colors.white : colors.backgroundLight;
  
  const borderColor  = bg === 'gray'
    ? focused ? colors.borderFocus : colors.gray200   // on gray: white bg, brand border on focus only
    : focused ? colors.borderFocus : colors.gray200 ;  // on white: gray bg, brand border on focus only
  const borderWidth  = focused ? 1.5 : 1.5;

  const hasError = !!error;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.wrapper}>

      {/* Label */}
      {!!label && (
        <Text style={[styles.label, disabled && styles.labelDisabled]}>
          {label}
        </Text>
      )}

      {/* Input box */}
      <View
        style={[
          styles.inputBox,
          { backgroundColor: inputBg, borderColor, borderWidth },
          hasError  && styles.inputBoxError,
          disabled  && styles.inputBoxDisabled,
          multiline && { alignItems: 'flex-start', paddingVertical: 10 },
        ]}
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
          style={[
            styles.input,
            isNumber    && styles.inputNumber,
            multiline   && { minHeight: numberOfLines * 22, textAlignVertical: 'top' },
            disabled    && styles.inputDisabled,
             textAlign && { textAlign },
          ]}
          value={displayValue}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          keyboardType={KEYBOARD_MAP[type]}
          secureTextEntry={isPassword && !secureVisible}
          autoCapitalize={autoCapitalize ?? (type === 'email' ? 'none' : isNumber ? 'none' : 'sentences')}
          autoCorrect={type === 'text'}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          editable={!disabled}
          onFocus={() => { setFocused(true);  onFocus?.(); }}
          onBlur={() =>  { setFocused(false); onBlur?.();  }}
        />

        {/* Right — password toggle */}
        {isPassword && (
          <TouchableOpacity
            onPress={() => setSecureVisible((v) => !v)}
            style={styles.iconRight}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon
              name={secureVisible ? 'visibility' : 'visibility-off'}
              size={18}
              color={colors.gray400}
            />
          </TouchableOpacity>
        )}

        {/* Right — custom icon */}
        {!isPassword && !!iconRight && (
          <TouchableOpacity
            onPress={onIconRightPress}
            style={styles.iconRight}
            disabled={!onIconRightPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name={iconRight} size={18} color={colors.gray400} />
          </TouchableOpacity>
        )}
      </View>

      {/* Error */}
      {hasError && (
        <View style={styles.errorRow}>
          <Icon name="error-outline" size={13} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Hint */}
      {!hasError && !!hint && (
        <Text style={styles.hint}>{hint}</Text>
      )}

    </View>
  );
};

export default InputField;





// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: { gap: 6 },


   label: { fontSize: 10, fontWeight: '800', color: colors.textPlaceholder, letterSpacing: 1.2, textTransform: 'uppercase' },


  labelDisabled: { opacity: 0.5 },

  inputBox: {
    flexDirection:     'row',
    alignItems:        'center',
    borderRadius:      10,
    paddingHorizontal: 12,
    minHeight:         48,
    gap:               8,
  },
  inputBoxError:    { borderWidth: 1.5, borderColor: colors.danger, backgroundColor: colors.errorBg },
  inputBoxDisabled: { opacity: 0.5 },

  input: {
    flex:       1,
    fontSize:   14,
    fontWeight: '500',
    color:      colors.gray900,
    paddingVertical: 0,   // removes default Android padding
  },
  inputNumber:   { textAlign: 'right' },
  inputDisabled: { color: colors.gray500 },

  iconLeft:  { },
  iconRight: { paddingLeft: 4 },

  errorRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  errorText: { fontSize: 12, color: colors.danger, fontWeight: '500' },

  hint: { fontSize: 12, color: colors.gray400 },
});