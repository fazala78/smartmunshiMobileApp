// screens/TenantVerificationScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { verifyTenant } from '../services/tenantService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

// Import reusable components
import { Button } from '../components/ui/Button';
import InputField from '../components/ui/InputField';
import { IconButton } from '../components/ui/IconButton';
import { colors, spacing, typography } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TenantVerification'>;
};

const TenantVerificationScreen: React.FC<Props> = ({ navigation }) => {
  const [tenantKey, setTenantKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleVerifyTenant = async (): Promise<void> => {
    if (!tenantKey.trim()) {
      setError('Please enter a tenant key');
      return;
    }

    setError('');
    setLoading(true);
    
    try {
      const response = await verifyTenant(tenantKey);
      
      if (response.success && response.tenant) {
        await AsyncStorage.setItem('tenant', JSON.stringify(response.tenant));
        await AsyncStorage.setItem('tenantKey', response.tenant.id);
        
        Alert.alert(
          'Success', 
          `Welcome to ${response.tenant.name || 'POS System'}!`,
          [
            {
              text: 'Continue',
              onPress: () => navigation.replace('Login')
            }
          ]
        );
      } else {
        setError('Invalid response from server. Please try again.');
      }
      
    } catch (error: any) {
      setError(
        error.message || error.response?.data?.message || 'Verification failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundLight} />
      
      {/* Icon Container */}
      <View style={styles.iconContainer}>
        <Image 
            source={require('../assets/logo.png')} // Ensure path is correct
            style={styles.logo}
            resizeMode="contain"
          />
      </View>

      {/* Header Text */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Enter your Application Key to continue</Text>
        <Text style={styles.subtitle}>
          This key identifies your specific organization or store and securely connects you to your store.
        </Text>
      </View>

      {/* Form Section - Using Reusable Components */}
      <View style={styles.formContainer}>
         <View style={styles.field}>
         <InputField
            bg="white"
            textAlign="left"
             label="App Key"
            type="email"
            value={tenantKey}
            onChangeText={(text: React.SetStateAction<string>) => {
              setTenantKey(text);
              setError(''); // Clear error on input
            }}
              placeholder="e.g., ORG-12345"
            icon="key"
          />
          </View>

        <Button
          title="Connect to Store"
          onPress={handleVerifyTenant}
          loading={loading}
          variant="primary"
          size="medium"
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <IconButton
          icon="❓"
          label="Where do I find my tenant key?"
          variant="muted"
          onPress={() => {
            Alert.alert(
              'Finding Your Tenant Key',
              'Contact your administrator or check your welcome email for your tenant key.'
            );
          }}
        />
        
        <View style={styles.secureContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.secureText}>SECURE CONNECTION</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
   field: {
    gap: 8,
    marginBottom: 20,
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 120,
    height:100,
  },
  
  iconText: {
    fontSize: 48,
  },
  headerContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.heading2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  formContainer: {
    marginTop: spacing.sm,
  },
  footer: {
    marginTop: 'auto',
    marginBottom: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  secureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    opacity: 0.4,
  },
  lockIcon: {
    fontSize: 10,
  },
  secureText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
   logo: {
    width: '70%',
    height: '70%',
  },
});

export default TenantVerificationScreen;