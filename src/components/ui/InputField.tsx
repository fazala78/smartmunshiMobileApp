import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardTypeOptions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, typography } from '../../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldType = 'text' | 'number' | 'decimal' | 'email' | 'phone' | 'password';

export interface InputFieldProps {
  value:             string | number | null | undefined;
  onChangeText:      (value: string) => void;

  /** 'gray' — renders on a gray background (white input)
   *  'white' — renders on a white background (gray input)
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

  // ── Ref — lets the wrapper TouchableOpacity programmatically focus ─────────
  const inputRef = useRef<TextInput>(null);

  const isPassword   = type === 'password';
  const isNumber     = type === 'number' || type === 'decimal';
  const displayValue = value != null ? String(value) : '';

  // ── Theming ────────────────────────────────────────────────────────────────
  const inputBg     = bg === 'gray' ? colors.white : colors.backgroundLight;
  const borderColor = focused ? colors.borderFocus : colors.gray200;
  const borderWidth = 1.5;
  const hasError    = !!error;

  /**
   * FIX: Called when the user taps the wrapper row — icon, padding, label area.
   * Focuses the hidden TextInput so the keyboard opens immediately.
   * The 50 ms delay gives RN time to register the touch before focusing.
   */
  const handleRowPress = () => {
    if (disabled) return;
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.wrapper}>

      {/* Label — tapping it also focuses the input */}
      {!!label && (
        <TouchableOpacity onPress={handleRowPress} activeOpacity={1}>
          <Text style={[styles.label, disabled && styles.labelDisabled]}>
            {label}
          </Text>
        </TouchableOpacity>
      )}

      {/*
       * FIX: inputBox is now a TouchableOpacity instead of a plain View.
       *
       * Tapping the left icon, right icon area, or any horizontal padding
       * gap now all route to handleRowPress → inputRef.current?.focus().
       *
       * accessible={false}  — prevents VoiceOver announcing a redundant
       *   "button" on top of the already-accessible TextInput.
       * activeOpacity={0.9} — subtle press feedback on the whole row.
       *
       * Inner buttons (password toggle, iconRight) use activeOpacity={1}
       * so only the outer wrapper dims on press — no double-dim.
       */}
      <TouchableOpacity
        style={[
          styles.inputBox,
          { backgroundColor: inputBg, borderColor, borderWidth },
          hasError  && styles.inputBoxError,
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
            isNumber  && styles.inputNumber,
            multiline && { minHeight: numberOfLines * 22, textAlignVertical: 'top' },
            disabled  && styles.inputDisabled,
            { textAlign },
          ]}
          value={displayValue}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          keyboardType={KEYBOARD_MAP[type]}
          secureTextEntry={isPassword && !secureVisible}
          autoCapitalize={
            autoCapitalize ?? (type === 'email' ? 'none' : isNumber ? 'none' : 'sentences')
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

        {/* Right — password toggle
            activeOpacity={1}: outer wrapper already dims; no double-dim here.
            RN gives touch priority to the innermost responder so this fires
            setSecureVisible, NOT handleRowPress. */}
        {isPassword && (
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

        {/* Right — custom icon
            Same activeOpacity={1} reasoning as above. */}
        {!isPassword && !!iconRight && (
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
  inputBoxError:    { borderWidth: 1.5, borderColor: colors.danger, backgroundColor: colors.errorBg },
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