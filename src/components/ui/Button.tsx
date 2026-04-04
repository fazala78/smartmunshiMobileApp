import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../../theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  loading = false,
  variant = 'primary',
  size = 'medium',
  fullWidth = true,
  disabled,
  style,
  ...props
}) => {
  const buttonStyles: ViewStyle[] = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.buttonDisabled,
    style,
  ].filter(Boolean);

  const textStyles: TextStyle[] = [
    styles.buttonText,
    styles[`buttonText_${variant}`],
    styles[`buttonText_${size}`],
  ].filter(Boolean);

  return (
    <TouchableOpacity
      style={buttonStyles}
      disabled={disabled || loading}
      activeOpacity={0.9}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#102216' : '#8fc201'} />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  fullWidth: {
    width: '100%',
  },
  // Variants
  button_primary: {
    backgroundColor: colors.primary,
  },
  button_secondary: {
    backgroundColor: colors.primaryMuted,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#8fc201',
    shadowOpacity: 0,
    elevation: 0,
  },
  // Sizes
  button_small: {
    height: 40,
    paddingHorizontal: 16,
  },
  button_medium: {
    height: 56,
    paddingHorizontal: 20,
  },
  button_large: {
    height: 64,
    paddingHorizontal: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Text Styles
  buttonText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonText_primary: {
    color: '#ffffff',
  },
  buttonText_secondary: {
    color: '#8fc201',
  },
  buttonText_outline: {
    color: '#8fc201',
  },
  buttonText_small: {
    fontSize: 14,
  },
  buttonText_medium: {
    fontSize: 18,
  },
  buttonText_large: {
    fontSize: 20,
  },
});