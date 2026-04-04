import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  TouchableOpacityProps,
} from 'react-native';

interface IconButtonProps extends TouchableOpacityProps {
  icon: string;
  label: string;
  variant?: 'default' | 'muted';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  variant = 'default',
  style,
  ...props
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      activeOpacity={0.7}
      {...props}
    >
      <Text style={[styles.icon, variant === 'muted' && styles.iconMuted]}>
        {icon}
      </Text>
      <Text style={[styles.label, variant === 'muted' && styles.labelMuted]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 14,
    marginRight: 4,
  },
  iconMuted: {
    opacity: 0.5,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#102216',
  },
  labelMuted: {
    color: 'rgba(16, 34, 22, 0.5)',
  },
});

